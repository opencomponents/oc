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

  describe('when validating component', function(){

    describe('when component\'s handlebars version is obsolete', function(){
      var template = {compiler:[6,'>= 2.0.0-beta.1'],main:function(){return'Hello world!';},useData:!0};

      var result = validator.validateComponent(template, {
        templateType: 'handlebars'
      });

      it('should error', function(){
        expect(result.isValid).to.be.false;
        expect(result.error).to.be.equal('The component can\'t be rendered because it was published with an older OC version');
      });
    });

    describe('when component\'s handlebars version is supported', function(){
      var template = {compiler:[7,'>= 4.0.0'],main:function(){return'Hello world!';},useData:!0};

      var result = validator.validateComponent(template, {
        templateType: 'handlebars'
      });

      it('should be valid', function(){
        expect(result.isValid).to.be.true;
      });
    });

    describe('when component\'s template type is jade', function(){

      var result = validator.validateComponent('', {
        templateType: 'jade'
      });

      it('should be valid', function(){
        expect(result.isValid).to.be.true;
      });
    });
  });
});