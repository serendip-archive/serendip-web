import { ServerRequestInterface, ServerResponseInterface } from "serendip";
import * as underscore from "underscore";
import * as request from "request";
import * as moment from "moment";
import * as sutils from "serendip-utility";
declare global {
  const Modules: {
    _: typeof underscore;
    request: typeof request;
    handlebars: typeof Handlebars;
    moment: typeof moment;
    utils: typeof sutils;
  };
  const Server: {
    request: ServerRequestInterface;
    response: ServerResponseInterface;
  };
}
