 

[![MIT Licence](https://badges.frapsoft.com/os/mit/mit.svg?v=103)](https://opensource.org/licenses/mit-license.php)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://GitHub.com/m-esm/serendip/graphs/commit-activity)
[![Website shields.io](https://img.shields.io/website-up-down-green-red/http/shields.io.svg)](https://serendip.agency/)
![Open Source Love](https://badges.frapsoft.com/os/v1/open-source.png?v=103)
![TypeScript](https://badges.frapsoft.com/typescript/love/typescript.svg?v=101)

#### It's a lightweight web server for creating websites using handlebars and javascript.


> install:
```
npm i serendip-web -g
```

##### Arguments:
         -p,--port to specify port
         -d,--dir to specify directory
         -t,--tunnel to enable local tunnel
         -h,--help to view help
         -m,--multi to serve multiple websites. matches the hostname with folder in directory
         --example to create example folder with default template. (pick this in your first try)
         --demo to preview without creating example folder


##### Examples:
        serendip-web --example
        serendip-web -p 2020
        serendip-web -p 2020 -t
        serendip-web --port 8080
        serendip-web --port 8080 --tunnel
        serendip-web --demo --tunnel
        serendip-web --example --tunnel
        serendip-web --example=newsite.com --tunnel



___
![alt text for screenshot of example site](https://raw.githubusercontent.com/m-esm/serendip-web/master/example.jpg "screenshot of example site")