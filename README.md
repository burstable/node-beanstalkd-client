# node-beanstalkd-client

A low-level* beanstalkd client for Node.js.
Inspired by the great work on [fivebeans](https://github.com/ceejbot/fivebeans) but updated to ES6 and promises.

* The client will handle connections and command request/responses, but does setup everything required to run workers.

## Install

`$ npm install --save beanstalkd`

## Usage

```js
import Beanstalkd from 'beanstalkd';

const beanstalkd = new Beanstalkd(host, port);

beanstalkd.connect().then(function (beanstalkd) {
  // Verbosely put a new job
  beanstalkd.use(tube).then(function () {
    return beanstalkd.put(priority, delay, ttr);
  }).then(function () {
    return beanstalkd.close();
  });

  // Or use fancy bluebird features
  beanstalkd.call('use', tube)
            .call('put', priority, delay, ttr);
});
```

## API

- [Commands](docs/api/commands.md)