import {Type} from 'types';
import {expect} from 'chai';

describe('types', function () {
  describe('Type', function () {
    describe('toString', function () {
      it('should return a name/type identifier', function () {
        var type;

        type = new Type('id', Number);
        expect(type.toString()).to.equal('id<Number>');

        type = new Type('tube', String);
        expect(type.toString()).to.equal('tube<String>');

        type = new Type('body', Buffer);
        expect(type.toString()).to.equal('body<Buffer>');
      });
    });

    describe('validateInput', function () {
      it('should validate a buffer', function () {
        var type = new Type(Math.random().toString(), Buffer);

        expect(type.validateInput(Math.random().toString())).to.equal(true);
        expect(type.validateInput(new Buffer(Math.random().toString()))).to.equal(true);
        expect(type.validateInput({})).to.equal(false);
      });

      it('should validate a number', function () {
        var type = new Type(Math.random().toString(), Number);

        expect(type.validateInput(Math.floor(Math.random() * 9999))).to.equal(true);
        expect(type.validateInput(Math.floor(Math.random() * 9999).toString())).to.equal(true);
        expect(type.validateInput(new Buffer(1))).to.equal(false);
        expect(type.validateInput({})).to.equal(false);
      });

      it('should validate a string', function () {
        var type = new Type(Math.random().toString(), String);

        expect(type.validateInput(Math.random().toString())).to.equal(true);
        expect(type.validateInput(Math.random())).to.equal(false);
        expect(type.validateInput(new Buffer(Math.random().toString()))).to.equal(false);
        expect(type.validateInput({})).to.equal(false);
      });
    });
  });
});