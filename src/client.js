import net from 'net';
import Promise from 'bluebird';
import ReadQueue from './read-queue';
import {BasicReader, BodyReader, YamlReader} from './reader';
import {BasicWriter, BodyWriter} from './writer';
import {Type, IdType, PriorityType, DelayType, TubeType, IgnoreType, BodyType, YamlBodyType} from './types';

const debug = require('debug')('beanstalkd');
const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 11300;

export default class BeanstalkdClient {
  constructor(host, port, options) {
    this.host = host || DEFAULT_HOST;
    this.port = port || DEFAULT_PORT;
    this.options = options || {};
    this.readQueue = null;
    this.closed = false;
  }

  connect() {
    return new Promise((resolve, reject) => {
      debug('connecting to %s:%s', this.host, this.port);
      let connection = net.createConnection(this.port, this.host);

      connection.on('error', function (err) {
        reject(err);
      });

      connection.on('connect', () => {
        debug('connected to %s:%s', this.host, this.port);
        this.connection = connection;
        this.readQueue = new ReadQueue(this.connection);
        resolve(this);
      });

      connection.on('close', () => {
        debug('connection closed');
        this.closed = true;
        this.connection = null;
      });
    });
  }

  on(event, ...args) {
    this.connection.on(event, ...args);
  }

  quit() {
    if (this.connection) {
      this.connection.end();
    }
    return Promise.resolve();
  }
}

function makeCommand(writer, reader) {
  var command = function (...args) {
    var onConnectionEnded
      , connection = this.connection;

    return new Promise((resolve, reject) => {
      onConnectionEnded = function (error) {
        reject(error || 'CLOSED');
      };

      connection.once('close', onConnectionEnded);
      connection.once('error', onConnectionEnded);

      this.readQueue.push(function (data) {
        return reader.handle(data, resolve, reject);
      });

      writer.handle(connection, ...args);
    }).finally(() => {
      connection.removeListener('close', onConnectionEnded);
      connection.removeListener('error', onConnectionEnded);
    });
  };

  command.writer = writer;
  command.reader = reader;

  return command;
}

BeanstalkdClient.prototype.use = makeCommand(
  new BasicWriter('use', new TubeType()),
  new BasicReader('USING', new TubeType())
);

BeanstalkdClient.prototype.listTubeUsed = makeCommand(
  new BasicWriter('list-tube-used'),
  new BasicReader('USING', new TubeType())
);

BeanstalkdClient.prototype.pauseTube = makeCommand(
  new BasicWriter('pause-tube', new TubeType(), new DelayType()),
  new BasicReader('PAUSED')
);

BeanstalkdClient.prototype.put = makeCommand(
  new BodyWriter('put', new PriorityType(), new DelayType(), new Type('ttr', Number), new BodyType()),
  new BasicReader('INSERTED', new IdType())
);

BeanstalkdClient.prototype.watch = makeCommand(
  new BasicWriter('watch', new TubeType()),
  new BasicReader('WATCHING', new TubeType())
);
BeanstalkdClient.prototype.ignore = makeCommand(
  new BasicWriter('ignore', new TubeType()),
  new BasicReader('WATCHING', new TubeType())
);

/* Reserve commands */
BeanstalkdClient.prototype.reserve = makeCommand(
  new BasicWriter('reserve'),
  new BodyReader('RESERVED', new IdType(), new BodyType())
);
BeanstalkdClient.prototype.reserveWithTimeout = makeCommand(
  new BasicWriter('reserve-with-timeout', new Type('timeout', Number)),
  new BodyReader('RESERVED', new IdType(), new BodyType())
);

/* Job commands */
BeanstalkdClient.prototype.destroy = makeCommand(
  new BasicWriter('delete', new IdType()),
  new BasicReader('DELETED')
);
BeanstalkdClient.prototype.bury = makeCommand(
  new BasicWriter('bury', new IdType(), new PriorityType()),
  new BasicReader('BURIED')
);
BeanstalkdClient.prototype.release = makeCommand(
  new BasicWriter('release', new IdType(), new PriorityType(), new DelayType()),
  new BasicReader('RELEASED')
);
BeanstalkdClient.prototype.touch = makeCommand(
  new BasicWriter('touch', new IdType()),
  new BasicReader('TOUCHED')
);
BeanstalkdClient.prototype.kickJob = makeCommand(
  new BasicWriter('kick-job', new IdType()),
  new BasicReader('KICKED')
);

/* Peek commands */
BeanstalkdClient.prototype.peek = makeCommand(
  new BasicWriter('peek', new IdType()),
  new BodyReader('FOUND', new IgnoreType(), new BodyType())
);

BeanstalkdClient.prototype.peekReady = makeCommand(
  new BasicWriter('peek-ready'),
  new BodyReader('FOUND', new IdType(), new BodyType())
);

BeanstalkdClient.prototype.peekDelayed = makeCommand(
  new BasicWriter('peek-delayed'),
  new BodyReader('FOUND', new IdType(), new BodyType())
);

BeanstalkdClient.prototype.peekBuried = makeCommand(
  new BasicWriter('peek-buried'),
  new BodyReader('FOUND', new IdType(), new BodyType())
);

/* Commands that returns YAML */
BeanstalkdClient.prototype.listTubesWatched = makeCommand(
  new BasicWriter('list-tubes-watched'),
  new YamlReader('OK', new YamlBodyType())
);
BeanstalkdClient.prototype.listTubes = makeCommand(
  new BasicWriter('list-tubes'),
  new YamlReader('OK', new YamlBodyType())
);
BeanstalkdClient.prototype.statsJob = makeCommand(
  new BasicWriter('stats-job', new IdType()),
  new YamlReader('OK', new YamlBodyType())
);
BeanstalkdClient.prototype.statsTube = makeCommand(
  new BasicWriter('stats-tube', new TubeType()),
  new YamlReader('OK', new YamlBodyType())
);
BeanstalkdClient.prototype.stats = makeCommand(
  new BasicWriter('stats'),
  new YamlReader('OK', new YamlBodyType())
);
