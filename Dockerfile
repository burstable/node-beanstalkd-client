FROM node:4.0.0

RUN mkdir -p /src/client
WORKDIR /src/client

# npm install
COPY package.json /src/client/
RUN npm install

ENV NODE_PATH=/src/client/src

COPY . /src/client