FROM node:alpine
WORKDIR /webserver
COPY . .
RUN npm install
ENV multi=true
ENV demo=false
EXPOSE 2080
USER node
CMD [ "node", "bin/server.js", "-d www/ -m ${multi} --demo ${demo}" ]