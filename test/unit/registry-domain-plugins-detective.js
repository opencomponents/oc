'use strict';

const expect = require('chai').expect;

describe('registry : domain : plugins-detective', () => {

  const detective = require('../../src/registry/domain/plugins-detective');

  describe('when detecting plugins usage', () => {

    describe('when plugins not detected', () => {
      const code = 'module.exports.data=function(context, callback){ callback(null, {}); };';

      it('should return blank array', () => {
        expect(detective.parse(code)).to.eql([]);
      });
    });

    describe('when plugin detected', () => {
      const code = 'module.exports.data=function(context, callback){ callback(null, { bla: context.plugins.bla(\'args\',123)}); };';

      it('should return plugin names', () => {
        expect(detective.parse(code)).to.eql(['bla']);
      });
    });

    describe('when minified plugins call present', () => {
      const code = 'var hello="something";module.exports.data=function(a,b){b(null,{bla:a.plugins.bla(\'args\',123)}); };';

      it('should detect it', () => {
        expect(detective.parse(code)).to.eql(['bla']);
      });
    });
  });
});