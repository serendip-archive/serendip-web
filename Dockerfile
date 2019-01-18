FROM node:alpine
WORKDIR /webserver
COPY . .
RUN npm install
ENV multi=true
ENV demo=false
EXPOSE 80
USER node
CMD [ "node", "bin/server.js", " -p 80 -d /webserver/ -m ${multi} --demo ${demo}" ]