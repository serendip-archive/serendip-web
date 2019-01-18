FROM node:alpine
WORKDIR /webserver
COPY . .
RUN npm install
EXPOSE 2080
USER node
ENV multi=true
ENV demo=false
ENV dir=/websites
CMD node bin/server.js --dir=${dir} --multi=${multi} --demo=${demo}