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
        throw new Error(`No read queue item for item, length: ${result.length}`);
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

