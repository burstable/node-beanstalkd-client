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
