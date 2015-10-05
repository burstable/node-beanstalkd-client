import Client from 'client';
import {expect} from 'chai';
import Promise from 'bluebird';

const host = process.env.BEANSTALKD_PORT_11300_TCP_ADDR;
const port = process.env.BEANSTALKD_PORT_11300_TCP_PORT;

describe('BeanstalkdClient', function () {
  describe('connected', function () {
    beforeEach(function () {
      this.client = new Client(host, port);
      return this.client.connect();
    });

    afterEach(function () {
      return this.client.quit();
    });

    it('should be able to to use a tube', function () {
      let tube = Math.random().toString();
      return expect(this.client.use(tube)).to.eventually.equal(tube).then(() => {
        return expect(this.client.listTubeUsed()).to.eventually.equal(tube);
      });
    });

    it('should be able to put and peek job', function () {
      var values = {};
      values[Math.random().toString()] = Math.random().toString();
      values[Math.random().toString()] = Math.random().toString();
      values[Math.random().toString()] = Math.random().toString();
      values[Math.random().toString()] = Math.random().toString();

      return this.client.use(Math.random().toString()).then(() => {
        return this.client.put(0, 0, 60, JSON.stringify(values));
      }).then((jobId) => {
        return this.client.peek(jobId).then(function (payload) {
          expect(Buffer.isBuffer(payload)).to.be.ok;
          expect(JSON.parse(payload.toString())).to.deep.equal(values);
        });
      });
    });

    it('should be able to watch and ignore', function () {
      let tube = "ABC"+Math.random().toString(); // js-yaml parses it back to a number, so prefixing with letters
      return this.client.watch(tube).then(() => {
        return this.client.ignore('default');
      }).then(() => {
        return this.client.listTubesWatched();
      }).then(function (tubes) {
        expect(tubes).to.deep.equal([
          tube
        ]);
      });
    });

    it('should be able to put and reserve a job', function () {
      let worker = new Client(host, port)
        , tube = Math.random().toString()
        , values = {};

      values[Math.random().toString()] = Math.random().toString();
      values[Math.random().toString()] = Math.random().toString();
      values[Math.random().toString()] = Math.random().toString();
      values[Math.random().toString()] = Math.random().toString();

      return worker.connect().then(() => {
        return Promise.join(
          this.client.use(tube),
          worker.watch(tube).then(function () {
            return worker.ignore('default');
          })
        );
      }).then(() => {
        return this.client.put(0, 0, 60, JSON.stringify(values)).then((putId) => {
          return worker.reserveWithTimeout(0).spread((reserveId, body) => {
            expect(putId).to.equal(reserveId);
            expect(JSON.parse(body.toString())).to.deep.equal(values);
          });
        });
      }).finally(function () {
        worker.quit();
      });
    });
  });
});