'use strict';

var expect = require('chai').expect;
var injectr = require('injectr')
var sinon = require('sinon');

var consoleMock = require('../mocks/console');

describe('cli : facade : preview', function(){

  var opnSpy, parseStub;

  var execute = function(href, parsed){

    opnSpy = sinon.spy();
    parseStub = sinon.stub().yields(null, parsed);

    var PreviewFacade = injectr('../../cli/facade/preview.js', {
      opn: opnSpy,
      '../../registry/domain/url-parser': {
        parse: parseStub
      }
    });

    var previewFacade = new PreviewFacade({ logger: consoleMock })
    consoleMock.reset();

    previewFacade({ componentHref: href });
    var logs = consoleMock.get();
  };

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