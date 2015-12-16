import {CRLF} from './misc';

export class Writer {
  constructor(command, ...types) {
    this.command = command;
    this.types = types;
  }

  validateArgs(args) {
    if (args.length !== this.types.length) {
      let typesString = this.types.map(function (type) {
        return type.toString();
      }).join(', ');

      throw new Error(`Argument length mismatch for ${this.command}, expected ${typesString}`);
    }
  }
}

export class BasicWriter extends Writer {
  async handle(connection, ...args) {
    this.validateArgs(args);

    args.unshift(this.command);

    await new Promise(resolve => {
      connection.write(Buffer.concat([new Buffer(args.join(' ')), CRLF]), resolve);
    });
  }
}

export class BodyWriter extends BasicWriter {
  async handle(connection, ...args) {
    this.validateArgs(args);

    let body = args.pop();

    if (!Buffer.isBuffer(body)) {
      body = new Buffer(body);
    }

    args.unshift(this.command);
    args.push(body.length);

    await new Promise(resolve => {
      connection.write(Buffer.concat([new Buffer(args.join(' ')), CRLF, body, CRLF]), resolve);
    });
  }
}
