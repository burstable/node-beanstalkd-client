import yaml from 'js-yaml';
import {IgnoreType} from './types';

const CRLF = new Buffer([0x0d, 0x0a]);

function extractHeader(data) {
  let length = data.indexOf(CRLF)
    , header = data.toString('utf8', 0, length)
    , remainder = data.slice(length + CRLF.length, data.length);

  return [header, remainder];
}

export function parseResult(result, types) {
  let offset = 0;

  result = result.slice(0);
  types.forEach(function (type, i) {
    if (type instanceof IgnoreType) {
      result.splice(i + offset, 1);
      offset--;
    }
  });

  return result;
}

export class BasicReader {
  constructor(expectation, ...types) {
    this.expectation = expectation;
    this.types = types;
  }

  handle(data, resolve, reject) {
    let [header, remainder] = extractHeader(data)
      , args = header.split(' ')
      , response = args.shift()
      , result = null;

    if (response === this.expectation) {
      result = args;

      // TODO: Parse types for IGNORE / casting

      resolve(result.length > 1 ? result : result[0]);
      return remainder;
    } else {
      reject(new Error(response));
      return remainder;
    }
  }
}

export class BodyReader extends BasicReader {
  constructor(expectation, ...types) {
    super(expectation, ...types);
  }

  parseBody(body) {
    return body;
  }

  handle(data, resolve, reject) {
    let [header, remainder] = extractHeader(data)
      , args = header.split(' ')
      , response = args.shift()
      , length = parseInt(args.pop(), 10)
      , result = null
      , body;

    if (response === this.expectation) {
      result = args;

      if (remainder.length < length) {
        throw new Error('Im lost!');
      } else {
        body = remainder.slice(0, length);
        remainder = remainder.slice(length + CRLF.length, remainder.length);
      }

      body = this.parseBody(body);

      result.push(body);
      result = parseResult(result, this.types);
      resolve(result.length > 1 ? result : result[0]);
      return remainder;
    } else {
      reject(new Error(response));
      return remainder;
    }
  }
}

export class YamlReader extends BodyReader {
  parseBody(body) {
    return yaml.load(body.toString());
  }
}
