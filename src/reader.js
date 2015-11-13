import yaml from 'js-yaml';
import {IgnoreType} from './types';
import {CRLF} from './misc';

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

      result = parseResult(result, this.types);
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

    this.continue = null;
  }

  parseBody(body) {
    return body;
  }

  handle(data, resolve, reject) {
    if (this.continue) {
      let {
        length,
        result,
        body
      } = this.continue;

      body = Buffer.concat([body, data]);

      if (body.length - CRLF.length < length) {
        this.continue.body = body;
        return false;
      }

      this.continue = null;

      body = body.slice(0, length);
      remainder = body.slice(length + CRLF.length);

      body = this.parseBody(body);
      result.push(body);
      result = parseResult(result, this.types);
      resolve(result.length > 1 ? result : result[0]);
      return remainder;
    }

    let [header, remainder] = extractHeader(data)
      , args = header.split(' ')
      , response = args.shift()
      , length = parseInt(args.pop(), 10)
      , result = null
      , body;

    if (response === this.expectation) {
      result = args;

      if (remainder.length < length) {
        this.continue = {
          result: result,
          body: remainder,
          length: length
        };
        return false;
      } else {
        body = remainder.slice(0, length);
        remainder = remainder.slice(length + CRLF.length);
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
