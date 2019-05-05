import chalk from "chalk";
import * as fs from "fs-extra";
import * as glob from "glob";
import * as handlebars from "handlebars";
import * as htmlMinifier from "html-minifier";
import * as Moment from "moment";
import { join } from "path";
import * as Request from "request";
import * as dotenv from "dotenv";
import * as mime from "mime-types";

import {
  HttpRequestInterface,
  HttpResponseInterface,
  HttpRouter,
  HttpService,
  Server
} from "serendip";
import * as sUtils from "serendip-utility";
import * as _ from "underscore";
import * as SBC from "serendip-business-client";
import * as SMP from "serendip-mongodb-provider";
import * as SF from "serendip";
import { locales } from "./locales";
import { ServerServiceInterface } from "serendip-business-model";
import * as Cookies from 'cookies';

export class WebService implements ServerServiceInterface {
  static options: {
    sitesPath?: string;
    sitePath?: string;
  } = {
      sitesPath: join(__dirname, "..", "www")
    };
  static servers = {};

  static helperModules() {
    return _.clone({
      _,
      request: Request,
      moment: Moment,
      cookies: Cookies,
      handlebars: handlebars,
      utils: sUtils,
      fs: fs,
      SMP,
      SBC,
      SF
    });
  }
  static configure(opts?: typeof WebService.options) {
    WebService.options = _.extend(WebService.options, opts || {});
  }

  static handleError(error, sitePath, req, res) {
    if (typeof error != "undefined" && error) {
      res.statusCode = 500;

      WebService.renderHbs(
        { error: _.extend(error, { code: 500 }) },
        WebService.getMessagePagePath(),
        sitePath,
        req,
        res
      );
    }
  }
  /**
   *
   * @param script string to eval
   * @param sitePath root path of site
   * @param req server request
   * @param res server response
   */
  static async executeHbsJs(
    script: string,
    inputObjects: { locale?: any; model?: any; data?: any; error?: any },
    sitePath,
    req,
    res
  ): Promise<{ data: any; model: any; handlebars?: typeof handlebars } | void> {
    let hbsJsFunc: Function,
      hbsJsScript = script;

    try {
      hbsJsFunc = await (async function () {
        // evaluated script will have access to Server and Modules

        let modules;
        if (WebService.servers[sitePath]) {
          const jsServer = WebService.servers[sitePath];

          if (jsServer.modules) modules = jsServer.modules;
        }

        if (!modules) modules = WebService.helperModules();

        // overwrite to block access to global process



        const process = null;


        return eval(hbsJsScript);
      })();
    } catch (e) {
      return WebService.handleError(e, sitePath, req, res);
    }

    if (typeof hbsJsFunc === "function") {
      var hbsJsFuncResult;
      try {
        hbsJsFuncResult = (async function () {
          return await hbsJsFunc(inputObjects.data, inputObjects.model);
        })();
      } catch (e) {
        return WebService.handleError(e, sitePath, req, res);
      }

      if (hbsJsFuncResult) {
        return hbsJsFuncResult;
      } else {
        return { model: {}, data: {} };
      }
    } else {
      return { model: {}, data: {} };
    }
  }

  static readDirWithGlob(pathPattern): Promise<string[]> {
    return new Promise((resolve, reject) => {
      glob(join(pathPattern), (err, matches) => resolve(matches));
    });
  }
  static async renderHbs(
    inputObjects: { locale?: any; model?: any; data?: any; error?: any },
    hbsPath,
    sitePath,
    req,
    res: HttpResponseInterface
  ) {


    if (!inputObjects.error && typeof WebService.servers[sitePath].onRequest == 'function') {
      let onReqResult;

      try {
        onReqResult = await WebService.servers[sitePath].onRequest(
          req,
          res,
          inputObjects,
          sitePath
        );
      } catch (error) {
        if (error && typeof error == "object") {
          error.when = "executing server onRequest function";
          error.path = sitePath + '/server.js';
        }
        return WebService.handleError(error, sitePath, req, res);
      }

      if (res.finished) return;

      if (onReqResult && onReqResult.model) {
        inputObjects.model = _.extend(inputObjects.model, onReqResult.model);
      }

      if (onReqResult && onReqResult.data) {
        inputObjects.data = _.extend(inputObjects.data, onReqResult.data);
      }

    }

    var hbsJsPath = hbsPath + ".js";

    if (fs.existsSync(hbsJsPath)) {
      let hbsJsResult;

      try {
        hbsJsResult = await WebService.executeHbsJs(
          fs.readFileSync(hbsJsPath).toString(),
          inputObjects,
          sitePath,
          req,
          res
        );
      } catch (error) {
        if (error && typeof error == "object") {
          error.when = "executing hbs js file";
          error.path = hbsJsPath;
        }
        return WebService.handleError(error, sitePath, req, res);
      }

      if (res.finished) return;

      if (hbsJsResult && hbsJsResult.model) {
        inputObjects.model = _.extend(inputObjects.model, hbsJsResult.model);
      }

      if (hbsJsResult && hbsJsResult.data) {
        inputObjects.data = _.extend(inputObjects.data, hbsJsResult.data);
      }

    }


    var render,
      viewEngline = handlebars.noConflict(),
      hbsTemplate = viewEngline.compile(
        fs.readFileSync(hbsPath).toString() || ""
      );

    viewEngline.registerHelper("json", obj => JSON.stringify(obj, null, 2));
    viewEngline.registerHelper("append", (...items) =>
      items.filter(p => typeof p == "string" || typeof p == "number").join("")
    );
    viewEngline.registerHelper("unsafe", c => new handlebars.SafeString(c));

    var partialsPath = join(sitePath, "_partials");
    if (fs.existsSync(partialsPath)) {
      (await WebService.readDirWithGlob(
        join(partialsPath, "**/*.hbs")
      )).forEach(partialFilePath => {
        var partialName = partialFilePath
          .replace(partialsPath.replace(/\\/g, "/"), "")
          .replace(".hbs", "");

        if (partialName.startsWith("/")) partialName = partialName.substr(1);

        partialName = partialName.replace(/\//g, "-");
        viewEngline.registerPartial(
          partialName,
          fs.readFileSync(partialFilePath).toString()
        );
      });
    }

    try {
      render = hbsTemplate(inputObjects);
    } catch (error) {
      return res.json(error);
      // render = error.message || error;
    }

    if (!res.headersSent) res.setHeader("content-type", "text/html");

    res.write(
      htmlMinifier.minify(render, {
        collapseWhitespace: true,
        minifyCSS: true,
        minifyJS: true,
        minifyURLs: true,
        removeAttributeQuotes: true,
        sortAttributes: true,
        sortClassName: true,
        useShortDoctype: true
      })
    );

    if (!res.finished) res.end();
  }


  static async processRequest(
    req: HttpRequestInterface,
    res: HttpResponseInterface,
    next,
    done
  ) {
    if (req.url.indexOf("/api") !== 0) {
      let sitePath: string,
        locale: string,
        domain = req.headers.host.split(":")[0].replace("www.", "");

      if (Server.opts.logging == "info") {
        console.log(
          chalk.gray(
            `${Moment().format("HH:mm:ss")} ${domain} ${
            req.url
            } ${req.ip()} ${req.useragent()}`
          )
        );
      }

      if (!WebService.options.sitePath && WebService.options.sitesPath) {
        if (WebService.options.sitesPath.indexOf(".") === 0)
          WebService.options.sitesPath = join(
            process.cwd(),
            WebService.options.sitesPath
          );

        sitePath = join(WebService.options.sitesPath, domain);

        if (!fs.existsSync(WebService.options.sitesPath)) {
          var msg = "WebService.options.sitesPath is not valid!";
          res.write(msg);

          console.log(chalk.red(msg));
          res.end();
          return;
        }
      } else {
        sitePath = WebService.options.sitePath;
      }

      if (WebService.servers[sitePath]) {
        const jsServer = WebService.servers[sitePath];

        if (jsServer.error) {
          if (typeof jsServer.error == "object") {
            jsServer.error.when = jsServer.when;
            jsServer.error.path = jsServer.path;
          } else {
            jsServer.error = { message: jsServer.error };
          }

          return WebService.handleError(jsServer.error, sitePath, req, res);
        }
      }

      if (!fs.existsSync(sitePath)) {
        WebService.renderHbs(
          {
            error: {
              code: 500,
              message:
                "website directory for " +
                domain +
                " not found!<br>" +
                "sitePath:" +
                sitePath +
                "<br>" +
                "sitesPath:" +
                WebService.options.sitesPath
            }
          },
          WebService.getMessagePagePath(),
          sitePath,
          req,
          res
        );
        return;
      }

      if (req.url.indexOf(".hbs") != -1 || req.url === "/server.js") {
        WebService.renderHbs(
          {
            error: {
              code: "403",
              message: "access to this file is forbidden."
            }
          },
          WebService.getMessagePagePath(),
          sitePath,
          req,
          res
        );
        return;
      }

      if (fs.existsSync(join(sitePath, ".working"))) {
        WebService.renderHbs(
          {
            error: {
              message: "Website is under construction"
            }
          },
          WebService.getMessagePagePath(),
          sitePath,
          req,
          res
        );
        return;
      }
      const filePath = join(sitePath, req.url.split("?")[0] || "/");

      let hbsPath = '';
      if (filePath.endsWith("/") || filePath.endsWith("\\")) {
        hbsPath =
          filePath + 'index.hbs';

      } else {

        if (await fs.pathExists(filePath + '/index.hbs')) {
          hbsPath =
            filePath + '/index.hbs';
        } else {
          hbsPath =
            filePath + '.hbs';
        }

      }


      if (!fs.existsSync(hbsPath)) {
        if (!fs.existsSync(filePath)) {
          res.statusCode = 404;
          return WebService.renderHbs(
            {
              error: {
                message: req.url + " not found!",
                code: 404
              }
            },
            WebService.getMessagePagePath(),
            sitePath,
            req,
            res
          );
        } else
          return HttpService.processRequestToStatic(req, res, () => { }, sitePath);
      }




      const siteDataPath = join(sitePath, "data.json");

      let model: any = {};

      let data: any = {
        env: process.env
      };
      const hbsJsonPath = hbsPath + ".json";

      if (fs.existsSync(siteDataPath)) {
        try {
          data = _.extend(
            data,
            JSON.parse(fs.readFileSync(siteDataPath).toString())
          );
        } catch (error) { }
      }

      if (data.localization && data.localization.default)
        locale = data.localization.default;

      //  if (!sitePath.endsWith("/") || ) sitePath += "/";

      let localization = {};

      if (locale) {
        var tempLocale =
          locale.split("-")[0] + "-" + locale.split("-")[1].toUpperCase();
        localization = {
          code: tempLocale.toLowerCase(),
          localName: locales[tempLocale][0],
          englishName: locales[tempLocale][1],
          rtl: locales[tempLocale][2] || null
        };
      }

      let urlLocale = req.url.split("?")[0].split("/")[1] || "";
      if (urlLocale.indexOf("-") == 2) {
        urlLocale =
          urlLocale.split("-")[0] + "-" + urlLocale.split("-")[1].toUpperCase();
      }

      if (urlLocale) {
        if (locales[urlLocale]) {
          req.url = req.url
            .replace("/" + urlLocale, "")
            .replace("/" + urlLocale.toLowerCase(), "");

          localization = {
            code: urlLocale.toLowerCase(),
            localName: locales[urlLocale][0],
            englishName: locales[urlLocale][1],
            rtl: locales[urlLocale][2] || null
          };

          urlLocale = urlLocale.toLowerCase();
        } else urlLocale = null;
      }

      if (locale) {
        const localeDataPath = join(sitePath, "data." + locale + ".json");

        if (fs.existsSync(localeDataPath)) {
          try {
            data = _.extend(
              data,
              JSON.parse(fs.readFileSync(localeDataPath).toString())
            );
          } catch (error) { }
        } else fs.writeFileSync(localeDataPath, "{}");
      }

      if (urlLocale) {
        const urlLocaleDataPath = join(sitePath, "data." + urlLocale + ".json");

        if (fs.existsSync(urlLocaleDataPath)) {
          try {
            data = _.extend(
              data,
              JSON.parse(fs.readFileSync(urlLocaleDataPath).toString())
            );
          } catch (error) { }
        } else fs.writeFileSync(urlLocaleDataPath, "{}");
      }

      if (urlLocale) locale = urlLocale;




      if (fs.existsSync(hbsJsonPath)) {
        try {
          model = _.extend(
            model,
            JSON.parse(fs.readFileSync(hbsJsonPath).toString())
          );
        } catch (error) { }
      }

      // res.json({ domain, sitePath, url: req.url, filePath, fileExist: fs.existsSync(filePath), hbsPath });
      // return;

      WebService.renderHbs(
        { model, data, locale: localization },
        hbsPath,
        sitePath,
        req,
        res
      );

    } else {
      next();
    }
    // next();
  }

  static async processRequestToStatic(
    req: HttpRequestInterface,
    res: HttpResponseInterface,
    callback,
    staticPath?
  ) {
    var filePath = join(
      staticPath || HttpService.options.staticPath,
      req.url.split("?")[0]
    );
    fs.stat(filePath, (err, stat) => {
      if (err) {
        res.writeHead(404);
        res.end();

        return callback(404);
      }

      if (stat.isDirectory()) filePath = join(filePath, "index.html");

      fs.exists(filePath, exist => {
        if (exist) {


          let range: any = (req.headers.range) ? req.headers.range.toString().replace(/bytes=/, "").split("-") : [];

          range[0] = range[0] ? parseInt(range[0], 10) : 0;
          range[1] = range[1] ? (parseInt(range[1], 10) || 0) : range[0] + ((1024 * 1024) - 1);


          if (range[1] >= stat.size) {
            range[1] = stat.size - 1;
          }

          range = { start: range[0], end: range[1] };


          if (!req.headers.range) {

            res.writeHead(200, {
              "Content-Length": stat.size,
              "Content-Type": mime.lookup(filePath).toString(),
              'Accept-Ranges': 'bytes',
              "ETag": process.env.etag
            });

            var readStream = fs.createReadStream(filePath);
            readStream.pipe(res);
            callback(200, filePath);


          } else {

            res.writeHead(206, {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': 0,
              'Content-Type': mime.lookup(filePath),
              'Content-Disposition': `inline; filename=${encodeURIComponent(filePath.split('/')[filePath.split('/').length - 1])}`,
              'Accept-Ranges': 'bytes',
              'Content-Range': 'bytes ' + range.start + '-' + range.end + '/' + (stat.size),
              'Content-Length': range.end - range.start + 1,
              "ETag": process.env.etag
            });


            fs.createReadStream(filePath, {
              start: range.start,
              end: range.end
            }).pipe(res)

          }


        } else {
          res.writeHead(404);
          res.end();
          return callback(404);
        }
      });
    });
  }

  static getMessagePagePath() {
    if (WebService.options.sitesPath) {
      var inSitesPath = join(WebService.options.sitesPath, "message.hbs");
      if (fs.existsSync(inSitesPath)) return inSitesPath;
    }

    if (WebService.options.sitePath)
      if (fs.existsSync(join(WebService.options.sitePath, "message.hbs")))
        return join(WebService.options.sitePath, "message.hbs");

    return join(__dirname, "..", "www", "message.hbs");
  }
  constructor(private httpService: HttpService) {
    if (
      WebService.options.sitePath &&
      WebService.options.sitePath.indexOf(".") === 0
    ) {
      WebService.options.sitePath = join(
        process.cwd(),
        WebService.options.sitePath
      );
    }
  }

  async start() {

    if (WebService.options.sitePath) {
      console.log("\n\t founded server.js. going to start it ...");
      const serverFilePath = join(WebService.options.sitePath, "server.js");
      if (await fs.pathExists(serverFilePath)) {
        let serverClass = null;

        let serverError = null;

        try {
          serverClass = eval((await fs.readFile(serverFilePath)).toString())();
        } catch (error) {
          serverError = {
            error: error,
            when: "evaluating jsServer file",
            path: serverFilePath
          };
        }

        if (serverClass) {
          let serverObj = null;
          try {
            serverObj = new serverClass(WebService.helperModules());

            if (serverObj.start) {
              try {
                await serverObj.start();
              } catch (error) {
                serverError = {
                  error: error,
                  when: "starting jsServer",
                  path: serverFilePath
                };
              }
            }
            WebService.servers[WebService.options.sitePath] = serverObj;

            console.log("\n\tserver.js started.");
          } catch (error) {
            serverError = {
              error: error,
              when: "creating object from server class jsServer",
              path: serverFilePath
            };

            console.log("\n\tserver.js error", serverError);
          }
        }

        if (serverError)
          WebService.servers[WebService.options.sitePath] = serverError;
      }
    }
  }
}
