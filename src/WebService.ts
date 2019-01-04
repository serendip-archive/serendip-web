import {
  ServerRouter,
  ServerServiceInterface,
  EmailService,
  Server,
  EmailModel,
  SmsIrService,
  ServerRequestInterface,
  ServerResponseInterface
} from "serendip";
import { join, basename } from "path";
import * as fs from "fs";
import * as handlebars from "handlebars";
import * as _ from "underscore";
import * as Request from "request";
import * as Moment from "moment";
import * as sUtils from "serendip-utility";
import chalk from "chalk";

import * as htmlMinifier from "html-minifier";

export class WebService implements ServerServiceInterface {
  static options: {
    sitesPath?: string;
    sitePath?: string;
  } = {
    sitesPath: join(__dirname, "..", "www")
  };

  static configure(opts?: typeof WebService.options) {
    WebService.options = _.extend(WebService.options, opts || {});
  }
  static dependencies = [];

  static executeHbsJs(
    script: string,
    sitePath,
    req,
    res
  ): { model: any; handlebars?: typeof handlebars } {
    var hbsJsError,
      hbsJsFunc: Function,
      hbsJsScript = script;

    try {
      hbsJsFunc = (function() {
        let Server = {
          request: req,
          response: res
        };
        let Modules = {
          _,
          request: Request,
          moment: Moment,
          handlebars: handlebars,
          utils: sUtils
        };

        let process = null;

        return eval(hbsJsScript);
      })();
    } catch (e) {
      hbsJsError = e;
    }

    var handleError = () => {
      res.statusCode = 500;

      if (hbsJsError)
        WebService.renderHbs(
          { error: { message: hbsJsError, code: 500 } },
          WebService.getMessagePagePath(),
          sitePath,
          req,
          res
        );
    };

    handleError();

    if (typeof hbsJsFunc === "function") {
      var hbsJsFuncResult;
      try {
        hbsJsFuncResult = (async function() {
          return await hbsJsFunc();
        })();
      } catch (e) {
        hbsJsError = e;
      }

      handleError();

      if (hbsJsFuncResult) {
        return hbsJsFuncResult;
      } else {
        return { model: {} };
      }
    } else {
      return { model: {} };
    }
  }

  static async renderHbs(
    inputObjects: { model?: any; data?: any; error?: any },
    hbsPath,
    sitePath,
    req,
    res: ServerResponseInterface
  ) {
    var render,
      viewEngline = handlebars.noConflict(),
      hbsTemplate = viewEngline.compile(
        fs.readFileSync(hbsPath).toString() || ""
      );
    var hbsJsPath = hbsPath + ".js";

    if (fs.existsSync(hbsJsPath)) {
      var hbsJsResult = await WebService.executeHbsJs(
        fs.readFileSync(hbsJsPath).toString(),
        sitePath,
        req,
        res
      );

      if (res.finished) return;

      if (hbsJsResult.model) {
        inputObjects.model = _.extend(inputObjects.model, hbsJsResult.model);
      }
    }
    var partialsPath = join(sitePath, "_partials");
    if (fs.existsSync(partialsPath)) {
      fs.readdirSync(partialsPath)
        .filter(item => {
          return item.endsWith(".hbs");
        })
        .map(partialFileName => {
          return join(partialsPath, partialFileName);
        })
        .forEach(partialFilePath => {
          var partialName = basename(partialFilePath).replace(".hbs", "");

          viewEngline.registerPartial(
            partialName,
            fs.readFileSync(partialFilePath).toString()
          );
        });
    }

    try {
      render = hbsTemplate(inputObjects);
    } catch (error) {
      render = error.message || error;
    }

    if (!res.headersSent) res.setHeader("content-type", "text/html");


    res.send(
      htmlMinifier.minify(render, {
        collapseWhitespace: true,
        minifyCSS: true,
        minifyJS : true,
        minifyURLs:true,
        removeAttributeQuotes: true,
        sortAttributes : true,
        sortClassName : true,
        useShortDoctype : true
      })
    );
  }
  static async processRequest(
    req: ServerRequestInterface,
    res: ServerResponseInterface,
    next,
    done
  ) {
    if (req.url.indexOf("/api") !== 0) {
      var sitePath: string,
        domain = req.headers.host.split(":")[0].replace("www.", "");

      // if (domain == 'localhost' || domain == 'serendip.ir')
      //     domain = 'serendip.cloud';

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

        if (sitePath)
          if (sitePath.indexOf(".") === 0) {
            sitePath = join(process.cwd(), sitePath);
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

      if (req.url.indexOf(".hbs") != -1) {
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

      if (!sitePath.endsWith("/")) sitePath += "/";
      var filePath = join(sitePath, req.url.split("?")[0]);
      var hbsPath = filePath + (filePath.endsWith("/") ? "index.hbs" : ".hbs");

      var model: any = {};

      var data: any = {};
      var hbsJsonPath = hbsPath + ".json";

      var siteDataPath = join(sitePath, "data.json");

      if (fs.existsSync(siteDataPath)) {
        try {
          data = _.extend(
            data,
            JSON.parse(fs.readFileSync(siteDataPath).toString())
          );
        } catch (error) {}
      }

      if (fs.existsSync(hbsJsonPath)) {
        try {
          model = _.extend(
            model,
            JSON.parse(fs.readFileSync(hbsJsonPath).toString())
          );
        } catch (error) {}
      }

      // res.json({ domain, sitePath, url: req.url, filePath, fileExist: fs.existsSync(filePath), hbsPath });
      // return;
      if (fs.existsSync(hbsPath)) {
        WebService.renderHbs({ model, data }, hbsPath, sitePath, req, res);
      } else {
        if (!fs.existsSync(filePath)) {
          res.statusCode = 404;

          WebService.renderHbs(
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

          return;
        }
        ServerRouter.processRequestToStatic(req, res, () => {}, sitePath);
      }
    } else {
      next();
    }
    // next();
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

  constructor() {}

  async start() {}
}
