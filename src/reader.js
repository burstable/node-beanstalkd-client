import yaml from 'js-yaml';

export class BasicReader {
  constructor(expectation) {
    this.expectation = expectation;
    this.remainder = new Buffer(0);
  }

  parseData(data) {
    return data;
  }

  handle(protocol, data, resolve, reject) {
    let [remainder, result] = protocol.parseReply(Buffer.concat([this.remainder, data]));

    if (remainder && !result) {
      this.remainder = remainder;
      return;
    } else {
      this.remainder = new Buffer(0);
    }

    if (result.reply === this.expectation) {
      let args = []
        , spec = protocol.replyMap[result.reply];

      if (spec) {
        let bytes = spec.args.indexOf('bytes');
        args = spec.args.map(arg => result.args[arg]);
        if (bytes !== -1) {
          args.splice(bytes, 1);
          args[args.length - 1] = this.parseData(args[args.length - 1]);
        }
      }
      resolve(args.length > 1 ? args : args[0]);
      return remainder || new Buffer(0);
    } else {
      reject(new Error(result.reply));
      return remainder || new Buffer(0);
    }
  }
}

export class YamlReader extends BasicReader {
  parseData(data) {
    return yaml.load(data.toString());
  }
}
