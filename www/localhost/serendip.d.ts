
import { ServerRequestInterface, ServerResponseInterface } from "serendip";
import * as Underscore from "underscore";
import request = require("request");
import moment = require("moment");
import sUtils = require("serendip-utility");
import * as Handlebars from 'handlebars'
declare global {

    const Modules: {
        _: Underscore,
        request: request,
        handlebars: typeof Handlebars,
        moment: moment,
        utils: {
            text: typeof sUtils.text
            querystring: typeof sUtils.querystring
            validate: typeof sUtils.validate
        }
    }
    const Server: {
        request: ServerRequestInterface,
        response: ServerResponseInterface,

    }

}