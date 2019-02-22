import { HttpRequestInterface, HttpResponseInterface } from "serendip";
import * as underscore from "underscore";
import * as request from "request";
import * as moment from "moment";
import * as sutils from "serendip-utility";
import * as SerendipBusinessClient from "serendip-business-client";
import * as Handlebars from "handlebars";
declare global {
  let modules: {
    _: typeof underscore;
    request: typeof request;
    handlebars: typeof Handlebars;
    moment: typeof moment;
    utils: typeof sutils;
    sbc: {
      auth: SerendipBusinessClient.AuthService;
      data: SerendipBusinessClient.DataService;
      httpClient: SerendipBusinessClient.HttpClientService;
      localStorage: SerendipBusinessClient.LocalStorageService;
      business: SerendipBusinessClient.BusinessService;
    };
  };
  const req: HttpRequestInterface;

  const res: HttpResponseInterface;
}
