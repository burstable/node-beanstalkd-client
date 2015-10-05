import BeanstalkdClient from 'client';
import {expect} from 'chai';
import sinon from 'sinon';
import net from 'net';

describe('BeanstalkdClient', function () {
  beforeEach(function () {
    this.sinon = sinon.sandbox.create();

    this.connectionStub = {
      on: this.sinon.spy()
    };
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

    it('should resolve on error event', function () {
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
        , args;

      event = Math.random().toString();
      args = [Math.random().toString(), Math.random().toString()];

      this.client.on(event, ...args);
      expect(this.connectionStub.on).to.have.been.calledWith(event, ...args);

      event = Math.random().toString();
      args = [Math.random().toString()];

      this.client.on(event, ...args);
      expect(this.connectionStub.on).to.have.been.calledWith(event, ...args);
    });
  });
});