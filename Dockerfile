FROM node:alpine
WORKDIR /webserver
COPY . .
RUN npm install
ENV multi=true
ENV demo=false
ENV dir=www/
EXPOSE 2080
USER node
CMD [ "node", "bin/server.js", "--dir=$dir" , "--multi=$multi" , "--demo=$demo" ]