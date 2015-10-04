const CRLF = new Buffer([0x0d, 0x0a]);

export class BasicWriter {
  constructor(command, ...types) {
    this.command = command;
    this.types = types;
  }

  handle(connection, ...args) {
    args.unshift(this.command);
    connection.write(Buffer.concat([new Buffer(args.join(' ')), CRLF]));
  }
}

export class BodyWriter extends BasicWriter {
  handle(connection, ...args) {
    let body = args.pop();

    if (!Buffer.isBuffer(body)) {
      body = new Buffer(body);
    }

    args.unshift(this.command);
    args.push(body.length);
    connection.write(Buffer.concat([new Buffer(args.join(' ')), CRLF, body, CRLF]));
  }
}
