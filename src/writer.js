export class Writer {
  constructor(command) {
    this.command = command;
  }
}

export class BasicWriter extends Writer {
  async handle(protocol, connection, ...args) {
    await new Promise(resolve => {
      connection.write(protocol.buildCommand(this.command, args), resolve);
    });
  }
}

export class BodyWriter extends BasicWriter {
  async handle(protocol, connection, ...args) {
    let body = args.pop();

    if (!Buffer.isBuffer(body)) {
      body = new Buffer(body);
    }

    args.push(body.length);
    args.push(body);

    await new Promise(resolve => {
      connection.write(protocol.buildCommand(this.command, args), resolve);
    });
  }
}
