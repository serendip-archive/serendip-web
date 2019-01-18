FROM node:alpine
WORKDIR /webserver
COPY . .
RUN npm install
ENV multi=true
ENV demo=false
EXPOSE 2080
USER node
RUN  node bin/server.js -d www/ -m ${multi} --demo ${demo}