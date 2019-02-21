import { HttpEndpointInterface, Server } from "serendip";
import * as _ from "underscore";

export class StatusController {
  constructor() {}

  clusterTesting: HttpEndpointInterface = {
    publicAccess: true,
    route: "/api/server/cluster-testing",
    method: "get",
    actions: [
      (req, res, next, done) => {
        res.write("received in worker " + Server.worker.id);
        res.end();
      }
    ]
  };

  services: HttpEndpointInterface = {
    method: "get",
    publicAccess: true,
    actions: [
      (req, res, next, done) => {
        var model = _.keys(Server.services);
        res.json(model);
      }
    ]
  };
}
