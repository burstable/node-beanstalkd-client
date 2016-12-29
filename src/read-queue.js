export default class ReadQueue {
  constructor(connection) {
    this.connection = connection;
    this.queue = [];
    this.current = null;

    this.connection.on('data', (data) => {
      this.read(data);
    });
  }

  get length() {
    return this.queue.length;
  }

  push(callback) {
    this.queue.push(callback);
  }

  read(data) {
    var result;

    if (this.current === null) {
      this.current = this.queue.shift();

      if (!this.current) {
        this.connection.emit('error', new Error(`No read queue item for item, length: ${data.length}`));
        console.log('No read queue item'/* , data.toString() */);
        this.connection.destroy();
        return;
      }
    }

    result = this.current(data);

    if (result) {
      this.current = null;
      if (Buffer.isBuffer(result) && result.length) {
        this.read(result);
      }
    }
  }
}
