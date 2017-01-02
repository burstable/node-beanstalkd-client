import {expect} from 'chai';
import BeanstalkdClient from 'client';
import BeanstalkdProtocol from 'beanstalkd-protocol';
import Promise from 'bluebird';
import sinon from 'sinon';

describe('BeanstalkdClient', function () {
  describe('extension', function () {
    beforeEach(function () {
      this.sinon = sinon.sandbox.create();
    });

    afterEach(function () {
      this.sinon.restore();
    });

    it('exposes protocol', function () {
      let client = new BeanstalkdClient();
      expect(client.protocol).to.be.an.instanceOf(BeanstalkdProtocol);
    });

    it('lets you overwrite protocol', function () {
      let protocol = new BeanstalkdProtocol();
      BeanstalkdClient.prototype.protocol = protocol;
      expect(BeanstalkdClient.prototype.protocol).to.equal(protocol);

      let client = new BeanstalkdClient();
      expect(client.protocol).to.equal(protocol);
    });

    it('lets you add command', async function () {
      BeanstalkdClient.prototype.protocol.addType('key', String);
      BeanstalkdClient.prototype.protocol.addCommand('AUTH <key>\r\n');
      BeanstalkdClient.prototype.protocol.addReply('OK\r\n');
      BeanstalkdClient.addCommand('auth', 'OK');

      let client = new BeanstalkdClient();
      expect(client.auth).to.be.ok;

      this.sinon.stub(client, '_command').returns(Promise.resolve('OK'));

      let key = Math.random().toString();
      let result = await client.auth(key);

      expect(result).to.equal('OK');
      expect(client._command).to.have.been.calledWith('auth', [key]);
    });
  });
});
