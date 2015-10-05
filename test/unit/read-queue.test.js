import ReadQueue from 'read-queue';
import {expect} from 'chai';
import sinon from 'sinon';

describe('ReadQueue', function () {
  beforeEach(function () {
    this.sinon = sinon.sandbox.create();

    this.connectionStub = {
      on: this.sinon.spy()
    };

    this.queue = new ReadQueue(this.connectionStub);
  });

  afterEach(function () {
    this.sinon.restore();
  });

  describe('constructor', function () {
    it('should call read on data event', function () {
      var readSpy = this.sinon.stub(this.queue, 'read')
        , data = new Buffer(Math.random().toString());

      this.connectionStub.on.withArgs('data').getCall(0).args[1](data);

      expect(readSpy).to.have.been.calledWith(data);
    });
  });

  describe('read', function () {
    it('should call the first reader and stop if no remaining data', function () {
      var spy = this.sinon.spy()
        , reader = function(data) {
            spy(data);
            return new Buffer(0);
          }
        , data = new Buffer(100);

      this.queue.push(reader);

      this.queue.read(data); // actual

      expect(spy).to.have.been.calledOnce;
      expect(this.queue.current).to.equal(null);
      expect(this.queue.length).to.equal(0);
    });

    it('should continously run through the queue untill there is no remaining data', function () {
      var spyA = this.sinon.spy()
        , readerA = function(data) {
            spyA(data);
            return data.slice(33, data.length);
          }
        , spyB = this.sinon.spy()
        , readerB = function(data) {
            spyB(data);
            return data.slice(33, data.length);
          }
        , spyC = this.sinon.spy()
        , readerC = function(data) {
            spyC(data);
            return data.slice(33, data.length);
          }
        , data = new Buffer(99);

      this.queue.push(readerA);
      this.queue.push(readerB);
      this.queue.push(readerC);

      this.queue.read(data);

      expect(spyA).to.have.been.calledOnce;
      expect(spyB).to.have.been.calledOnce;
      expect(spyC).to.have.been.calledOnce;

      expect(this.queue.current).to.equal(null);
      expect(this.queue.length).to.equal(0);
    });

    it('should recall the same reader if not done', function () {
      var spy = this.sinon.spy()
        , reader = function(data) {
            spy(data);
            return spy.callCount === 2 ? true : false;
          };

      this.queue.push(reader);

      this.queue.read(new Buffer(50));
      expect(this.queue.current).to.equal(reader);

      this.queue.read(new Buffer(50));
      expect(spy).to.have.been.calledTwice;
      expect(this.queue.length).to.equal(0);
    });
  });
});