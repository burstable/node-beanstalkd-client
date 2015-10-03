FROM node:4.0.0

RUN mkdir -p /src/burstable
WORKDIR /src/burstable

# npm install
COPY package.json /src/burstable/
RUN npm install

ENV NODE_PATH=/src/burstable/src

COPY . /src/burstable