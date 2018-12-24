 
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
