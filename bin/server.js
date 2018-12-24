#!/usr/bin/env node

var serendip = require('serendip');
var process = require('process');
var StatusController = require('../dist/StatusController');
var WebService = require('../dist/WebService');
var _ = require('underscore');

const chalk = require('chalk');
const clear = require('clear');
const figlet = require('figlet');
var argv = require('argv');
var path = require('path');
var fs = require('fs-extra');

var localtunnel = require('localtunnel');

console.log(
    chalk.yellow(
        figlet.textSync('Serendip Web', { horizontalLayout: 'full' })
    )

);


var args = argv.option([
    {
        name: 'port',
        short: 'p',
        type: 'string'
    },
    {
        name: 'help',
        short: 'h',
        type: 'boolean'
    },
    {
        name: 'multi',
        short: 'm',
        type: 'boolean'
    },
    {
        name: 'tunnel',
        short: 't',
        type: 'boolean'
    },
    {
        name: 'demo',
        type: 'boolean'
    },
    {
        name: 'example',
        type: 'string'
    },
    {
        name: 'dir',
        short: 'd',
        type: 'string'
    },
    {
        name: 'tunnel-hostname',
        type: 'string'
    },
    {
        name: 'tunnel-subdomain',
        type: 'string'
    }
]).run().options;


if (args.help) {


    console.log(chalk.bold('\nArguments:'));
    console.log(chalk.green('\t -d,--dir to specify directory'));
    console.log(chalk.green('\t -p,--port to specify port'));
    console.log(chalk.green('\t -t,--tunnel to enable local tunnel'));
    console.log(chalk.green('\t -h,--help to view help'));
    console.log(chalk.green('\t -m,--multi to serve multiple websites. matches the hostname with folder in directory'));
    console.log(chalk.green('\t --example to create example folder with default template. (pick this in your first try)'));
    console.log(chalk.green('\t --demo to preview without creating example folder'));



    console.log(chalk.bold('\nExamples:'));

    console.log(chalk.green('\tserendip-web -p 2020'));
    console.log(chalk.green('\tserendip-web -p 2020 -t'));
    console.log(chalk.green('\tserendip-web --port 8080'));
    console.log(chalk.green('\tserendip-web --port 8080 --tunnel\n\n'));

    return;

}


console.log(chalk.gray("Starting arguments:\n" + JSON.stringify(args, null, '\t') + '\n\n'));

if (args.multi) {

    WebService.WebService.configure({
        sitesPath: args.dir || process.cwd()
    });

} else {

    WebService.WebService.configure({
        sitePath: args.dir || process.cwd()
    });
}

var demoPath = path.join(__dirname, '..', 'www', 'localhost');

if (args.demo) {
    WebService.WebService.configure({
        sitePath: demoPath
    });
}

if (args.example) {

    var examplePath = path.join(process.cwd(), args.example.toString() != 'true' ? args.example : 'example');

    fs.copySync(demoPath, examplePath);

    WebService.WebService.configure({
        sitePath: examplePath
    });
}

serendip.start({
    cors: "*",
    logging: 'info',
    httpPort: args.port || 2080,
    cpuCores: 1,
    controllers: [
        StatusController.StatusController
    ],
    services: [
        WebService.WebService
    ],
    beforeMiddlewares: [WebService.WebService.processRequest]
})
    .then(() => {

        if (args.tunnel) {


            var tunnel = localtunnel(args.port || 2080, {
                subdomain: args["tunnel-subdomain"],
                local_host: args['tunnel-hostname'] || 'localhost'
            }, function (err, tunnel) {

                console.log('\n\tTemporary public url: ' + chalk.green(tunnel.url) + '\n')

            });

            tunnel.on('close', function () {
                // tunnels are closed
            });


        }

    })
    .catch(msg => console.log(msg));
