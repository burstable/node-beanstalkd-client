import net from 'net';
import Promise from 'bluebird';
import BeanstalkdProtocol from 'beanstalkd-protocol';
import ReadQueue from './read-queue';
import {BasicReader, BodyReader, YamlReader} from './reader';
import {BasicWriter, BodyWriter} from './writer';
import {IdType, TubeType, IgnoreType, BodyType, YamlBodyType} from './types';

const debug = require('debug')('beanstalkd');
const debugError = require('debug')('beanstalkd:error');
const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 11300;

export default class BeanstalkdClient {
  constructor(host, port, options) {
    this.host = host || DEFAULT_HOST;
    this.port = port || DEFAULT_PORT;
    this.options = options || {};
    this.protocol = new BeanstalkdProtocol();
    this.readQueue = null;
    this.writeQueue = Promise.resolve();
    this.closed = false;

    this.use = makeCommand(
      new BasicWriter('use'),
      new BasicReader('USING', new TubeType())
    );

    this.listTubeUsed = makeCommand(
      new BasicWriter('list-tube-used'),
      new BasicReader('USING', new TubeType())
    );

    this.pauseTube = makeCommand(
      new BasicWriter('pause-tube'),
      new BasicReader('PAUSED')
    );

    this.put = makeCommand(
      new BodyWriter('put'),
      new BasicReader('INSERTED', new IdType())
    );

    this.watch = makeCommand(
      new BasicWriter('watch'),
      new BasicReader('WATCHING', new TubeType())
    );
    this.ignore = makeCommand(
      new BasicWriter('ignore'),
      new BasicReader('WATCHING', new TubeType())
    );

    /* Reserve commands */
    this.reserve = makeCommand(
      new BasicWriter('reserve'),
      new BodyReader('RESERVED', new IdType(), new BodyType())
    );
    this.reserveWithTimeout = makeCommand(
      new BasicWriter('reserve-with-timeout'),
      new BodyReader('RESERVED', new IdType(), new BodyType())
    );

    /* Job commands */
    this.destroy = makeCommand(
      new BasicWriter('delete'),
      new BasicReader('DELETED')
    );
    this.bury = makeCommand(
      new BasicWriter('bury'),
      new BasicReader('BURIED')
    );
    this.release = makeCommand(
      new BasicWriter('release'),
      new BasicReader('RELEASED')
    );
    this.touch = makeCommand(
      new BasicWriter('touch'),
      new BasicReader('TOUCHED')
    );
    this.kickJob = makeCommand(
      new BasicWriter('kick-job'),
      new BasicReader('KICKED')
    );

    /* Peek commands */
    this.peek = makeCommand(
      new BasicWriter('peek'),
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
      new BasicWriter('stats-job'),
      new YamlReader('OK', new YamlBodyType())
    );
    this.statsTube = makeCommand(
      new BasicWriter('stats-tube'),
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
  let command = async function (...args) {
    let onConnectionEnded
      , connection = this.connection
      , protocol = this.protocol
      , result;

    if (this.closed) throw new Error('Connection is closed');

    await this.writeQueue;

    try {
      result = new Promise((resolve, reject) => {
        onConnectionEnded = function (error) {
          reject(error || 'CLOSED');
        };

        connection.once('close', onConnectionEnded);
        connection.once('error', onConnectionEnded);

        this.readQueue.push(function (data) {
          return reader.handle(data, function (result) {
            connection.removeListener('close', onConnectionEnded);
            connection.removeListener('error', onConnectionEnded);

            resolve(result);
          }, function (err) {
            connection.removeListener('close', onConnectionEnded);
            connection.removeListener('error', onConnectionEnded);

            reject(err);
          });
        });
        writer.handle(protocol, connection, ...args);
      });

      this.writeQueue = result.reflect();

      await result;

      debug(`Sent command "${writer.command} ${args.join(' ')}"`);
    } catch (err) {
      debugError(`Command "${writer.command} ${args.join(' ')}" ${err.toString()}`);
      throw err;
    } finally {
      connection.removeListener('close', onConnectionEnded);
      connection.removeListener('error', onConnectionEnded);
    }

    return result;
  };

  command.writer = writer;
  command.reader = reader;

  return command;
}
