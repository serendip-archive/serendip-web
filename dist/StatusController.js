"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const serendip_1 = require("serendip");
const _ = require("underscore");
class StatusController {
    constructor() {
        this.clusterTesting = {
            publicAccess: true,
            route: "/api/server/cluster-testing",
            method: "get",
            actions: [
                (req, res, next, done) => {
                    res.write("received in worker " + serendip_1.Server.worker.id);
                    res.end();
                }
            ]
        };
        this.services = {
            method: "get",
            publicAccess: true,
            actions: [
                (req, res, next, done) => {
                    var model = _.keys(serendip_1.Server.services);
                    res.json(model);
                }
            ]
        };
    }
}
exports.StatusController = StatusController;
