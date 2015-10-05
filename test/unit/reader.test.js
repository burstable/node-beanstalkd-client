import {BasicReader, BodyReader, YamlReader} from 'reader';
import {CRLF} from 'misc';
import {expect} from 'chai';
import sinon from 'sinon';

describe('reader', function () {
  beforeEach(function () {
    this.sinon = sinon.sandbox.create();
  });

  afterEach(function () {
    this.sinon.restore();
  });

  describe('BasicReader', function () {
    it('should extract the header and resolve with the rest of arguments', function () {
      var expectation = Math.random().toString()
        , reader = new BasicReader(expectation, [])
        , resolve = this.sinon.stub()
        , result = [Math.random().toString(), Math.random().toString()]
        , data = Buffer.concat([new Buffer([expectation].concat(result).join(' ')), CRLF]);

      reader.handle(data, resolve);

      expect(resolve).to.have.been.calledWith(result);
    });

    it('should resolve with a single argument', function () {
      var resolve = this.sinon.stub()
        , expectation = Math.random().toString()
        , reader = new BasicReader(expectation, [])
        , result = [Math.random().toString()]
        , data = Buffer.concat([new Buffer([expectation].concat(result).join(' ')), CRLF]);

      reader.handle(data, resolve);

      expect(resolve).to.have.been.calledWith(result[0]);
    });

    it('should reject if response does not match expectation', function () {
      var reject = this.sinon.stub()
        , reader = new BasicReader(Math.random().toString(), [])
        , error = Math.random().toString()
        , data = Buffer.concat([new Buffer(error), CRLF]);

      reader.handle(data, null, reject);

      expect(reject).to.have.been.calledOnce;
      expect(reject.getCall(0).args[0].message).to.equal(error);
    });
  });

  describe('BodyReader', function () {
    it('should resolve with arguments and job body', function () {
      var resolve = this.sinon.stub()
        , expectation = Math.random().toString()
        , reader = new BodyReader(expectation, [])
        , body = new Buffer(Math.random().toString()+Math.random().toString()+Math.random().toString()+Math.random().toString())
        , result = [Math.random().toString(), body.length]
        , data = Buffer.concat([new Buffer([expectation].concat(result).join(' ')), CRLF, body, CRLF]);

      reader.handle(data, resolve);

      expect(resolve).to.have.been.calledWith([result[0], body]);
    });
  });
});
