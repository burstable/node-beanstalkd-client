import {BasicReader, BodyReader, YamlReader} from 'reader';
import {expect} from 'chai';
import sinon from 'sinon';
import BeanstalkdProtocol from 'beanstalkd-protocol';
const protocol = new BeanstalkdProtocol();
const CRLF = new Buffer([0x0d, 0x0a]);

describe('reader', function () {
  beforeEach(function () {
    this.sinon = sinon.sandbox.create();
  });

  afterEach(function () {
    this.sinon.restore();
  });

  describe('BasicReader', function () {
    it('should reject if response does not match expectation', function () {
      var reject = this.sinon.stub()
        , reader = new BasicReader(Math.random().toString(), [])
        , error = Math.random().toString()
        , data = Buffer.concat([new Buffer(error), CRLF]);

      reader.handle(protocol, data, null, reject);

      expect(reject).to.have.been.calledOnce;
      expect(reject.getCall(0).args[0].message).to.equal(error);
    });
  });
});
