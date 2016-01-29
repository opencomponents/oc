'use strict';

var expect = require('chai').expect;

describe('client : validator', function(){

  var validator = require('../../client/src/validator');

  describe('when validating configuration', function(){

    describe('when registries is an array', function(){

      var result = validator.validateConfiguration({
        registries: ['http://www.registries.com']
      });

      it('should error', function(){
        expect(result.isValid).to.be.false;
        expect(result.error).to.equal('Configuration is not valid: registries must be an object');
      });
    });

    describe('when registries doesn\'t have neither clientRendering or serverRendering properties', function(){

      var result = validator.validateConfiguration({
        registries: {}
      });

      it('should error', function(){
        expect(result.isValid).to.be.false;
        expect(result.error).to.equal('Configuration is not valid: registries must contain at least one endpoint');
      });
    });
  });
});