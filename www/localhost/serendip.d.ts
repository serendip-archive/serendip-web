import { HttpRequestInterface, HttpResponseInterface } from "serendip";
import * as underscore from "underscore";
import * as request from "request";
import * as moment from "moment";
import * as sutils from "serendip-utility";
import * as SerendipBusinessClient from "serendip-business-client";
declare global {
  const Modules: {
    _: typeof underscore;
    request: typeof request;
    handlebars: typeof Handlebars;
    moment: typeof moment;
    utils: typeof sutils;
    SBC: typeof SerendipBusinessClient;
  };
  const Server: {
    request: HttpRequestInterface;
    response: HttpResponseInterface;
  };
}
