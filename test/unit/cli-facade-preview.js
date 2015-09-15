'use strict';

var colors = require('colors');
var expect = require('chai').expect;
var injectr = require('injectr');
var sinon = require('sinon');

describe('cli : facade : preview', function(){

  var opnSpy, parseStub, logSpy = {};

  var execute = function(href, error, parsed){

    if(!parsed){
      parsed = error;
      error = null;
    }

    opnSpy = sinon.spy();
    parseStub = sinon.stub().yields(error, parsed);
    logSpy.log = sinon.spy();

    var PreviewFacade = injectr('../../cli/facade/preview.js', {
      opn: opnSpy,
      '../../registry/domain/url-parser': {
        parse: parseStub
      }
    }, {console:console});

    var previewFacade = new PreviewFacade({ logger: logSpy });
    previewFacade({ componentHref: href });
  };

  describe('when previewing not valid component', function(){

    beforeEach(function(){
      execute('http://registry.com/not-existing-component', '404!!!', {});
    });

    it('should not open any preview', function(){
      expect(opnSpy.called).to.be.false;
    });

    it('should show error message', function(){
      expect(logSpy.log.args[0][0]).to.equal('The specified path is not a valid component\'s url'.red);
    });
  });

  describe('when previewing /component', function(){

    beforeEach(function(){
      execute('http://registry.com/component', {
        registryUrl: 'http://registry.com/',
        componentName: 'component',
        version: '',
        parameters: {}
      });
    });

    it('should open /component/~preview', function(){
      expect(opnSpy.args[0][0]).to.equal('http://registry.com/component/~preview/');
    });
  });

  describe('when previewing /component/1.X.X', function(){

    beforeEach(function(){
      execute('http://registry.com/component/1.X.X', {
        registryUrl: 'http://registry.com/',
        componentName: 'component',
        version: '1.X.X',
        parameters: {}
      });
    });

    it('should open /component/1.X.X/~preview', function(){
      expect(opnSpy.args[0][0]).to.equal('http://registry.com/component/1.X.X/~preview/');
    });
  });

  describe('when previewing /component?hello=world', function(){

    beforeEach(function(){
      execute('http://registry.com/component?hello=world', {
        registryUrl: 'http://registry.com/',
        componentName: 'component',
        version: '',
        parameters: {hello: 'world'}
      });
    });

    it('should open /component/~preview/?hello=world', function(){
      expect(opnSpy.args[0][0]).to.equal('http://registry.com/component/~preview/?hello=world');
    });
  });

  describe('when previewing /component/?hello=world', function(){

    beforeEach(function(){
      execute('http://registry.com/component/?hello=world', {
        registryUrl: 'http://registry.com/',
        componentName: 'component',
        version: '',
        parameters: {hello: 'world'}
      });
    });

    it('should open /component/~preview/?hello=world', function(){
      expect(opnSpy.args[0][0]).to.equal('http://registry.com/component/~preview/?hello=world');
    });
  });

  describe('when previewing /component/1.X.X?hello=world', function(){

    beforeEach(function(){
      execute('http://registry.com/component/1.X.X?hello=world', {
        registryUrl: 'http://registry.com/',
        componentName: 'component',
        version: '1.X.X',
        parameters: {hello: 'world'}
      });
    });

    it('should open /component/~preview/?hello=world', function(){
      expect(opnSpy.args[0][0]).to.equal('http://registry.com/component/1.X.X/~preview/?hello=world');
    });
  });

  describe('when previewing /component/1.X.X/?hello=world', function(){

    beforeEach(function(){
      execute('http://registry.com/component/1.X.X/?hello=world', {
        registryUrl: 'http://registry.com/',
        componentName: 'component',
        version: '1.X.X',
        parameters: {hello: 'world'}
      });
    });

    it('should open /component/~preview/?hello=world', function(){
      expect(opnSpy.args[0][0]).to.equal('http://registry.com/component/1.X.X/~preview/?hello=world');
    });
  });
});