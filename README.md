# node-beanstalkd-client

A low-level* beanstalkd client for Node.js.
Inspired by the great work on [fivebeans](https://github.com/ceejbot/fivebeans) but updated to ES6 and promises.

\* The client will handle connections and command request/responses, but does not setup everything required to run workers.

For a high level beanstalkd worker client, see [node-beanstalkd-worker](https://github.com/burstable/node-beanstalkd-worker)

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
  });

  // Or use fancy bluebird features
  beanstalkd.call('use', tube)
            .call('put', priority, delay, ttr);

  // Close when done
  beanstalkd.quit();
});
```

## Commands

All beanstalkd commands are implemented per the protocol.
Method names are the same as beanstalk command names camelCased, list-tubes-watched becomes listTubesWatched.

## Debugging

Use `DEBUG=beanstalkd*` to enable verbose debugging.
