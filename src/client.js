import net from 'net';
import Promise from 'bluebird';
import BeanstalkdProtocol from 'beanstalkd-protocol';
import ReadQueue from './read-queue';
import {BasicReader, YamlReader} from './reader';
import {BasicWriter} from './writer';
import {commands, yamlCommands} from './commands';
import camelCase from 'lodash.camelcase';

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
    this.writeQueue = Promise.resolve();
    this.closed = false;
  }

  static addCommand(command, expected) {
    BeanstalkdClient.prototype[camelCase(command)] = makeCommand(
      command,
      new BasicWriter(command),
      new BasicReader(expected)
    );
  }

  static addYamlCommand(command, expected) {
    BeanstalkdClient.prototype[camelCase(command)] = makeCommand(
      command,
      new BasicWriter(command),
      new YamlReader(expected)
    );
  }

  destroy(...args) {
    return this['delete'](...args);
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
        this.closed = false;
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

  async _command(command, args, writer, reader) {
    let connection = this.connection
      , protocol = this.protocol
      , spec = protocol.commandMap[command]
      , result;

    if (spec.args.indexOf('bytes') > -1) {
      let data = args.pop();
      args.push(data.length);
      args.push(data);
    }

    if (this.closed) throw new Error('Connection is closed');

    let defered = defer();
    let onConnectionEnded = function (error) {
      defered.reject(error || new Error('CONNECTION_CLOSED'));
    };

    try {
      result = this.writeQueue.then(() => {
        connection.once('close', onConnectionEnded);
        connection.once('error', onConnectionEnded);

        this.readQueue.push(function (data) {
          return reader.handle(protocol, data, function (result) {
            connection.removeListener('close', onConnectionEnded);
            connection.removeListener('error', onConnectionEnded);

            defered.resolve(result);
          }, function (err) {
            connection.removeListener('close', onConnectionEnded);
            connection.removeListener('error', onConnectionEnded);

            defered.reject(err);
          });
        });
        writer.handle(protocol, connection, ...args).catch(defered.reject);

        return defered.promise;
      });

      this.writeQueue = defered.promise.reflect();

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

BeanstalkdClient.prototype.protocol = new BeanstalkdProtocol();

commands.forEach(([command, expectation]) => BeanstalkdClient.addCommand(command, expectation));
yamlCommands.forEach(([command, expectation]) => BeanstalkdClient.addYamlCommand(command, expectation));

function makeCommand(command, writer, reader) {
  let handler = function (...args) {
    return this._command(command, args, writer, reader);
  };

  return handler;
}

function defer() {
  let resolve, reject;
  let promise = new Promise(function () {
    resolve = arguments[0];
    reject = arguments[1];
  });
  return {
    resolve: resolve,
    reject: reject,
    promise: promise
  };
}
