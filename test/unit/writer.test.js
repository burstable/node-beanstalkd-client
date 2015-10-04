import {Writer, BasicWriter, BodyWriter} from 'writer';
import {Type} from 'types';
import {expect} from 'chai';

describe('writer', function () {
  describe('Writer', function () {
    describe('validateArgs', function () {
      it('should throw if argument length mismatch', function () {
        var writer
          , types
          , args
          , command = 'kill';

        types = [
          new Type('tube', String),
          new Type('delay', Number),
          new Type('ttr', Number)
        ];
        args = [Math.random().toString(), Math.random().toString()];
        writer = new Writer(command, ...types);

        expect(function () {
          writer.validateArgs(args)
        }).to.throw('Argument length mismatch for kill, expected tube<String>, delay<Number>, ttr<Number>');
      });
    });
  });
});