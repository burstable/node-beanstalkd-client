import BeanstalkdClient from 'client';
import {expect} from 'chai';
import sinon from 'sinon';
import net from 'net';
import {EventEmitter} from 'events';

describe('BeanstalkdClient', function () {
  beforeEach(function () {
    this.sinon = sinon.sandbox.create();

    this.connectionStub = new EventEmitter();
    this.sinon.spy(this.connectionStub, 'on');
    this.sinon.spy(this.connectionStub, 'once');
    this.sinon.spy(this.connectionStub, 'removeListener');
    this.connectionStub.write = this.sinon.stub();

    this.createConnectionStub = this.sinon.stub(net, 'createConnection').returns(this.connectionStub);
  });

  afterEach(function () {
    this.sinon.restore();
  });

  describe('connect', function () {
    beforeEach(function () {
      this.host = Math.random().toString();
      this.port = Math.floor(Math.random() * 9999);
      this.client = new BeanstalkdClient(this.host, this.port);
    });

    it('should call connect', function () {
      this.client.connect();
      expect(this.createConnectionStub).to.have.been.calledWith(this.port, this.host);
    });

    it('should resolve on connect event', function () {
      var promise = this.client.connect()
        , callback = this.connectionStub.on.withArgs('connect').getCall(0).args[1];

      expect(this.connectionStub.on.withArgs('connect')).to.have.been.calledOnce;
      expect(promise.isPending()).to.equal(true);

      callback(); // actual

      expect(promise.isFulfilled()).to.equal(true);
    });

    it('should reject on error event', function () {
      var promise = this.client.connect()
        , callback = this.connectionStub.on.withArgs('error').getCall(0).args[1];

      promise.catch(function () {});

      expect(this.connectionStub.on.withArgs('error')).to.have.been.calledOnce;
      expect(promise.isPending()).to.equal(true);

      callback(); // actual

      expect(promise.isRejected()).to.equal(true);
    });
  });

  describe('on', function () {
    beforeEach(function() {
      this.client = new BeanstalkdClient(Math.random().toString(), Math.random().toString());
      this.client.connect();
      this.connectionStub.on.withArgs('connect').getCall(0).args[1]();
    });

    it('should proxy calls to the connection', function () {
      var event
        , callback;

      event = Math.random().toString();
      callback = function() {};

      this.client.on(event, callback);
      expect(this.connectionStub.on).to.have.been.calledWith(event, callback);
    });
  });

  describe('commands', function () {
    it('should reject call if connection closes during command', async function () {
      let promise
        , client;

      client = new BeanstalkdClient(Math.random().toString(), Math.floor(Math.random() * 9999));
      client.connect();
      this.connectionStub.emit('connect');

      promise = client.watch(Math.random().toString()).then(function() {
        return client.reserve();
      });

      await client.writeQueue;

      this.connectionStub.emit('close');

      await expect(promise).to.be.rejectedWith('CLOSED');

      expect(this.connectionStub.removeListener).to.have.been.calledWith('close');
      expect(this.connectionStub.removeListener).to.have.been.calledWith('error');
    });

    it('should reject call if connection has an error during command', async function () {
      let promise
        , client
        , error = Math.random().toString();

      client = new BeanstalkdClient(Math.random().toString(), Math.floor(Math.random() * 9999));
      client.connect();
      this.connectionStub.emit('connect');

      promise = client.watch(Math.random().toString()).then(function() {
        return client.reserve();
      });

      await client.writeQueue;

      expect(this.connectionStub.listenerCount('close')).to.equal(2);
      expect(this.connectionStub.listenerCount('error')).to.equal(2);

      this.connectionStub.emit('error', error);

      await expect(promise).to.be.rejectedWith(error);
      expect(this.connectionStub.listenerCount('close')).to.equal(1);
      expect(this.connectionStub.listenerCount('error')).to.equal(1);
    });
  });

  describe('readQueue', function () {
    it('should close connection if read queue errors', function () {
      let client = new BeanstalkdClient(Math.random().toString(), Math.floor(Math.random() * 9999));
      client.connect();
      this.connectionStub.emit('connect');

      expect(() => {
        this.connectionStub.emit('data', new Buffer(Math.random().toString()));
      }).to.throw();

      expect(client.closed).to.equal(true);
      expect(client.error).to.be.ok;
    });
  });
});
