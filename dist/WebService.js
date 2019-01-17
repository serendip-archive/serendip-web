"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const serendip_1 = require("serendip");
const path_1 = require("path");
const fs = require("fs");
const handlebars = require("handlebars");
const _ = require("underscore");
const Request = require("request");
const Moment = require("moment");
const sUtils = require("serendip-utility");
const chalk_1 = require("chalk");
const htmlMinifier = require("html-minifier");
const locales_1 = require("./locales");
const glob = require("glob");
class WebService {
    constructor() { }
    static configure(opts) {
        WebService.options = _.extend(WebService.options, opts || {});
    }
    /**
     *
     * @param script string to eval
     * @param sitePath root path of site
     * @param req server request
     * @param res server response
     */
    static executeHbsJs(script, sitePath, req, res) {
        var hbsJsError, hbsJsFunc, hbsJsScript = script;
        try {
            hbsJsFunc = (function () {
                // evaluated script will have access to Server and Modules
                const Server = {
                    request: req,
                    response: res
                };
                const Modules = {
                    _,
                    request: Request,
                    moment: Moment,
                    handlebars: handlebars,
                    utils: sUtils
                };
                // overwrite to block access to global process
                const process = null;
                return eval(hbsJsScript);
            })();
        }
        catch (e) {
            hbsJsError = e;
        }
        var handleError = () => {
            if (typeof hbsJsError != "undefined" && hbsJsError) {
                res.statusCode = 500;
                WebService.renderHbs({ error: { message: hbsJsError, code: 500 } }, WebService.getMessagePagePath(), sitePath, req, res);
            }
        };
        handleError();
        if (typeof hbsJsFunc === "function") {
            var hbsJsFuncResult;
            try {
                hbsJsFuncResult = (async function () {
                    return await hbsJsFunc();
                })();
            }
            catch (e) {
                hbsJsError = e;
            }
            handleError();
            if (hbsJsFuncResult) {
                return hbsJsFuncResult;
            }
            else {
                return { model: {} };
            }
        }
        else {
            return { model: {} };
        }
    }
    static readDirWithGlob(pathPattern) {
        return new Promise((resolve, reject) => {
            glob(path_1.join(pathPattern), (err, matches) => resolve(matches));
        });
    }
    static async renderHbs(inputObjects, hbsPath, sitePath, req, res) {
        var render, viewEngline = handlebars.noConflict(), hbsTemplate = viewEngline.compile(fs.readFileSync(hbsPath).toString() || "");
        viewEngline.registerHelper("json", obj => JSON.stringify(obj, null, 2));
        viewEngline.registerHelper("append", (...items) => items.filter(p => typeof p == "string" || typeof p == "number").join(""));
        viewEngline.registerHelper("unsafe", c => new handlebars.SafeString(c));
        var hbsJsPath = hbsPath + ".js";
        if (fs.existsSync(hbsJsPath)) {
            var hbsJsResult = await WebService.executeHbsJs(fs.readFileSync(hbsJsPath).toString(), sitePath, req, res);
            if (res.finished)
                return;
            if (hbsJsResult.model) {
                inputObjects.model = _.extend(inputObjects.model, hbsJsResult.model);
            }
        }
        var partialsPath = path_1.join(sitePath, "_partials");
        if (fs.existsSync(partialsPath)) {
            (await WebService.readDirWithGlob(path_1.join(partialsPath, "**/*.hbs"))).forEach(partialFilePath => {
                var partialName = partialFilePath.replace(partialsPath.replace(/\\/g, '/'), '').replace('.hbs', '');
                if (partialName.startsWith('/'))
                    partialName = partialName.substr(1);
                partialName = partialName.replace(/\//g, '-');
                viewEngline.registerPartial(partialName, fs.readFileSync(partialFilePath).toString());
            });
        }
        try {
            render = hbsTemplate(inputObjects);
        }
        catch (error) {
            render = error.message || error;
        }
        if (!res.headersSent)
            res.setHeader("content-type", "text/html");
        res.send(htmlMinifier.minify(render, {
            collapseWhitespace: true,
            minifyCSS: true,
            minifyJS: true,
            minifyURLs: true,
            removeAttributeQuotes: true,
            sortAttributes: true,
            sortClassName: true,
            useShortDoctype: true
        }));
    }
    static async processRequest(req, res, next, done) {
        if (req.url.indexOf("/api") !== 0) {
            var sitePath, locale, domain = req.headers.host.split(":")[0].replace("www.", "");
            if (serendip_1.Server.opts.logging == "info") {
                console.log(chalk_1.default.gray(`${Moment().format("HH:mm:ss")} ${domain} ${req.url} ${req.ip()} ${req.useragent()}`));
            }
            if (!WebService.options.sitePath && WebService.options.sitesPath) {
                if (WebService.options.sitesPath.indexOf(".") === 0)
                    WebService.options.sitesPath = path_1.join(process.cwd(), WebService.options.sitesPath);
                sitePath = path_1.join(WebService.options.sitesPath, domain);
                if (!fs.existsSync(WebService.options.sitesPath)) {
                    var msg = "WebService.options.sitesPath is not valid!";
                    res.write(msg);
                    console.log(chalk_1.default.red(msg));
                    res.end();
                    return;
                }
            }
            else {
                sitePath = WebService.options.sitePath;
                if (sitePath)
                    if (sitePath.indexOf(".") === 0) {
                        sitePath = path_1.join(process.cwd(), sitePath);
                    }
            }
            if (!fs.existsSync(sitePath)) {
                WebService.renderHbs({
                    error: {
                        code: 500,
                        message: "website directory for " +
                            domain +
                            " not found!<br>" +
                            "sitePath:" +
                            sitePath +
                            "<br>" +
                            "sitesPath:" +
                            WebService.options.sitesPath
                    }
                }, WebService.getMessagePagePath(), sitePath, req, res);
                return;
            }
            if (req.url.indexOf(".hbs") != -1) {
                WebService.renderHbs({
                    error: {
                        code: "403",
                        message: "access to this file is forbidden."
                    }
                }, WebService.getMessagePagePath(), sitePath, req, res);
                return;
            }
            if (fs.existsSync(path_1.join(sitePath, ".working"))) {
                WebService.renderHbs({
                    error: {
                        message: "Website is under construction"
                    }
                }, WebService.getMessagePagePath(), sitePath, req, res);
                return;
            }
            var siteDataPath = path_1.join(sitePath, "data.json");
            var model = {};
            var data = {};
            var hbsJsonPath = hbsPath + ".json";
            if (fs.existsSync(siteDataPath)) {
                try {
                    data = _.extend(data, JSON.parse(fs.readFileSync(siteDataPath).toString()));
                }
                catch (error) { }
            }
            if (data.localization && data.localization.default)
                locale = data.localization.default;
            //  if (!sitePath.endsWith("/") || ) sitePath += "/";
            var localization = {};
            if (locale) {
                var tempLocale = locale.split("-")[0] + "-" + locale.split("-")[1].toUpperCase();
                localization = {
                    code: tempLocale.toLowerCase(),
                    localName: locales_1.locales[tempLocale][0],
                    englishName: locales_1.locales[tempLocale][1],
                    rtl: locales_1.locales[tempLocale][2] || null
                };
            }
            var urlLocale = req.url.split("?")[0].split("/")[1] || "";
            if (urlLocale.indexOf("-") == 2) {
                urlLocale =
                    urlLocale.split("-")[0] + "-" + urlLocale.split("-")[1].toUpperCase();
            }
            if (urlLocale) {
                if (locales_1.locales[urlLocale]) {
                    req.url = req.url
                        .replace("/" + urlLocale, "")
                        .replace("/" + urlLocale.toLowerCase(), "");
                    localization = {
                        code: urlLocale.toLowerCase(),
                        localName: locales_1.locales[urlLocale][0],
                        englishName: locales_1.locales[urlLocale][1],
                        rtl: locales_1.locales[urlLocale][2] || null
                    };
                    urlLocale = urlLocale.toLowerCase();
                }
                else
                    urlLocale = null;
            }
            if (locale) {
                var localeDataPath = path_1.join(sitePath, "data." + locale + ".json");
                if (fs.existsSync(localeDataPath)) {
                    try {
                        data = _.extend(data, JSON.parse(fs.readFileSync(localeDataPath).toString()));
                    }
                    catch (error) { }
                }
                else
                    fs.writeFileSync(localeDataPath, "{}");
            }
            if (urlLocale) {
                var urlLocaleDataPath = path_1.join(sitePath, "data." + urlLocale + ".json");
                if (fs.existsSync(urlLocaleDataPath)) {
                    try {
                        data = _.extend(data, JSON.parse(fs.readFileSync(urlLocaleDataPath).toString()));
                    }
                    catch (error) { }
                }
                else
                    fs.writeFileSync(urlLocaleDataPath, "{}");
            }
            if (urlLocale)
                locale = urlLocale;
            var filePath = path_1.join(sitePath, req.url.split("?")[0] || "/");
            var hbsPath = filePath +
                (filePath.endsWith("/") || filePath.endsWith("\\")
                    ? "index.hbs"
                    : ".hbs");
            if (fs.existsSync(hbsJsonPath)) {
                try {
                    model = _.extend(model, JSON.parse(fs.readFileSync(hbsJsonPath).toString()));
                }
                catch (error) { }
            }
            // res.json({ domain, sitePath, url: req.url, filePath, fileExist: fs.existsSync(filePath), hbsPath });
            // return;
            if (fs.existsSync(hbsPath)) {
                WebService.renderHbs({ model, data, locale: localization }, hbsPath, sitePath, req, res);
            }
            else {
                if (!fs.existsSync(filePath)) {
                    res.statusCode = 404;
                    WebService.renderHbs({
                        error: {
                            message: req.url + " not found!",
                            code: 404
                        }
                    }, WebService.getMessagePagePath(), sitePath, req, res);
                    return;
                }
                serendip_1.ServerRouter.processRequestToStatic(req, res, () => { }, sitePath);
            }
        }
        else {
            next();
        }
        // next();
    }
    static getMessagePagePath() {
        if (WebService.options.sitesPath) {
            var inSitesPath = path_1.join(WebService.options.sitesPath, "message.hbs");
            if (fs.existsSync(inSitesPath))
                return inSitesPath;
        }
        if (WebService.options.sitePath)
            if (fs.existsSync(path_1.join(WebService.options.sitePath, "message.hbs")))
                return path_1.join(WebService.options.sitePath, "message.hbs");
        return path_1.join(__dirname, "..", "www", "message.hbs");
    }
    async start() { }
}
WebService.options = {
    sitesPath: path_1.join(__dirname, "..", "www")
};
WebService.dependencies = [];
exports.WebService = WebService;
