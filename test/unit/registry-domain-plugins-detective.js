'use strict';

const expect = require('chai').expect;

describe('registry : domain : plugins-detective', function(){

  const detective = require('../../src/registry/domain/plugins-detective');

  describe('when detecting plugins usage', function(){

    describe('when plugins not detected', function(){
      const code = 'module.exports.data=function(context, callback){ callback(null, {}); };';

      it('should return blank array', function(){
        expect(detective.parse(code)).to.eql([]);
      });
    });

    describe('when plugin detected', function(){
      const code = 'module.exports.data=function(context, callback){ callback(null, { bla: context.plugins.bla(\'args\',123)}); };';

      it('should return plugin names', function(){
        expect(detective.parse(code)).to.eql(['bla']);
      });
    });

    describe('when minified plugins call present', function(){
      const code = 'var hello="something";module.exports.data=function(a,b){b(null,{bla:a.plugins.bla(\'args\',123)}); };';

      it('should detect it', function(){
        expect(detective.parse(code)).to.eql(['bla']);
      });
    });
  });
});