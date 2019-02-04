FROM node:10-alpine
ENV TERM=xterm-256color

WORKDIR /load-tester

COPY . .

RUN npm install

ENTRYPOINT ["node", "/load-tester/loadtest-kvstore.js"]
