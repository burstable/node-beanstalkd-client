import net from 'net';
import Promise from 'bluebird';
import ReadQueue from './read-queue';
import {BasicReader, BodyReader, YamlReader} from './reader';
import {BasicWriter, BodyWriter} from './writer';
import {Type, IdType, PriorityType, DelayType, TubeType, IgnoreType, BodyType, YamlBodyType} from './types';

const debug = require('debug')('beanstalkd');
const debugError = require('debug')('beanstalkd:error');
const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 11300;

export default class BeanstalkdClient {
  constructor(host, port, options) {
    this.host = host || DEFAULT_HOST;
    this.port = port || DEFAULT_PORT;
    this.options = options || {};
    this.readQueue = null;
    this.closed = false;

    this.use = makeCommand(
      new BasicWriter('use', new TubeType()),
      new BasicReader('USING', new TubeType())
    );

    this.listTubeUsed = makeCommand(
      new BasicWriter('list-tube-used'),
      new BasicReader('USING', new TubeType())
    );

    this.pauseTube = makeCommand(
      new BasicWriter('pause-tube', new TubeType(), new DelayType()),
      new BasicReader('PAUSED')
    );

    this.put = makeCommand(
      new BodyWriter('put', new PriorityType(), new DelayType(), new Type('ttr', Number), new BodyType()),
      new BasicReader('INSERTED', new IdType())
    );

    this.watch = makeCommand(
      new BasicWriter('watch', new TubeType()),
      new BasicReader('WATCHING', new TubeType())
    );
    this.ignore = makeCommand(
      new BasicWriter('ignore', new TubeType()),
      new BasicReader('WATCHING', new TubeType())
    );

    /* Reserve commands */
    this.reserve = makeCommand(
      new BasicWriter('reserve'),
      new BodyReader('RESERVED', new IdType(), new BodyType())
    );
    this.reserveWithTimeout = makeCommand(
      new BasicWriter('reserve-with-timeout', new Type('timeout', Number)),
      new BodyReader('RESERVED', new IdType(), new BodyType())
    );

    /* Job commands */
    this.destroy = makeCommand(
      new BasicWriter('delete', new IdType()),
      new BasicReader('DELETED')
    );
    this.bury = makeCommand(
      new BasicWriter('bury', new IdType(), new PriorityType()),
      new BasicReader('BURIED')
    );
    this.release = makeCommand(
      new BasicWriter('release', new IdType(), new PriorityType(), new DelayType()),
      new BasicReader('RELEASED')
    );
    this.touch = makeCommand(
      new BasicWriter('touch', new IdType()),
      new BasicReader('TOUCHED')
    );
    this.kickJob = makeCommand(
      new BasicWriter('kick-job', new IdType()),
      new BasicReader('KICKED')
    );

    /* Peek commands */
    this.peek = makeCommand(
      new BasicWriter('peek', new IdType()),
      new BodyReader('FOUND', new IgnoreType(), new BodyType())
    );

    this.peekReady = makeCommand(
      new BasicWriter('peek-ready'),
      new BodyReader('FOUND', new IdType(), new BodyType())
    );

    this.peekDelayed = makeCommand(
      new BasicWriter('peek-delayed'),
      new BodyReader('FOUND', new IdType(), new BodyType())
    );

    this.peekBuried = makeCommand(
      new BasicWriter('peek-buried'),
      new BodyReader('FOUND', new IdType(), new BodyType())
    );

    /* Commands that returns YAML */
    this.listTubesWatched = makeCommand(
      new BasicWriter('list-tubes-watched'),
      new YamlReader('OK', new YamlBodyType())
    );
    this.listTubes = makeCommand(
      new BasicWriter('list-tubes'),
      new YamlReader('OK', new YamlBodyType())
    );
    this.statsJob = makeCommand(
      new BasicWriter('stats-job', new IdType()),
      new YamlReader('OK', new YamlBodyType())
    );
    this.statsTube = makeCommand(
      new BasicWriter('stats-tube', new TubeType()),
      new YamlReader('OK', new YamlBodyType())
    );
    this.stats = makeCommand(
      new BasicWriter('stats'),
      new YamlReader('OK', new YamlBodyType())
    );
  }

  connect() {
    return new Promise((resolve, reject) => {
      debug('connecting to %s:%s', this.host, this.port);
      let connection = net.createConnection(this.port, this.host);

      connection.on('error', (err) => {
        this.closed = true;
        this.error = err;
        reject(err);
      });

      connection.on('connect', () => {
        debug('connected to %s:%s', this.host, this.port);
        this.connection = connection;
        this.readQueue = new ReadQueue(this.connection);
        resolve(this);
      });

      connection.on('end', () => {
        debug('connection finished');
        this.closed = true;
      });

      connection.on('close', () => {
        debug('connection closed');
        this.closed = true;
        this.connection = null;
      });
    });
  }

  unref() {
    this.connection.unref();
  }

  on(event, ...args) {
    this.connection.on(event, ...args);
  }

  quit() {
    this.closed = true;
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

    if (this.closed) throw new Error('Connection is closed');

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
    }).tap(function () {
      debug(`Sent command "${writer.command} ${args.join(' ')}"`);
    }).catch(function (err) {
      debugError(`Command "${writer.command} ${args.join(' ')}" ${err.toString()}`);
      throw err;
    }).finally(() => {
      connection.removeListener('close', onConnectionEnded);
      connection.removeListener('error', onConnectionEnded);
    });
  };

  command.writer = writer;
  command.reader = reader;

  return command;
}
