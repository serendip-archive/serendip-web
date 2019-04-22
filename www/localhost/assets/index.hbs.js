/// <reference path="../serendip.d.ts" />
async (data, model) => {

    res.json(modules.fs.readdirSync(sitePath + req.url.replace('/index', '')))

};
