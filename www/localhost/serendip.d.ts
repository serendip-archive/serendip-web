import * as SerendipFramework from "serendip";
import * as SerendipMongodbProvider from "serendip-mongodb-provider";
import * as underscore from "underscore";
import * as request from "request";
import * as moment from "moment";
import * as sutils from "serendip-utility";
import * as SerendipBusinessClient from "serendip-business-client";
import * as Handlebars from "handlebars";
declare global {
  let modules: {


    SF: typeof SerendipFramework;
    SMP: typeof SerendipMongodbProvider;
    SBC: typeof SerendipBusinessClient;

    _: typeof underscore;
    request: typeof request;
    handlebars: typeof Handlebars;
    moment: typeof moment;
    utils: typeof sutils;

    sbc: {
      db: SerendipBusinessClient.DbService;
      auth: SerendipBusinessClient.AuthService;
      data: SerendipBusinessClient.DataService;
      httpClient: SerendipBusinessClient.HttpClientService;
      localStorage: SerendipBusinessClient.LocalStorageService;
      business: SerendipBusinessClient.BusinessService;
    };
  };
  const req: SerendipFramework.HttpRequestInterface;
  const res: SerendipFramework.HttpResponseInterface;
}
