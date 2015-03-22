'use strict';

var expect = require('chai').expect;
var injectr = require('injectr');
var sinon = require('sinon');

describe('registry : domain : url-parser', function(){

  var parsed;
  var execute = function(url, returnVersion, callback){
    var urlParser = injectr('../../registry/domain/url-parser.js', {
      '../../utils/request': sinon.stub().yields(null, JSON.stringify({
        requestVersion: returnVersion
      }))
    });

    urlParser.parse(url, function(err, res){
      parsed = res;
      callback();
    });
  };
  
  describe('when parsing http://www.registry.com/api/v2/component-name', function(){

    before(function(done){
      execute('http://www.registry.com/api/v2/component-name', '', done);
    });

    it('componentName should be component-name', function(){
      expect(parsed.componentName).to.equal('component-name');
    });

    it('version should be blank', function(){
      expect(parsed.version).to.equal('');
    });

    it('registryUrl should be http://www.registry.com/api/v2/', function(){
      expect(parsed.registryUrl).to.equal('http://www.registry.com/api/v2/');
    });

    it('parameters should be {}', function(){
      expect(parsed.parameters).to.eql({});
    });

    it('clientHref should be http://www.registry.com/api/v2/oc-client/client.js', function(){
      expect(parsed.clientHref).to.equal('http://www.registry.com/api/v2/oc-client/client.js');
    });
  });
  
  describe('when parsing http://www.registry.com/component-name/~1.0.0/?hello=world', function(){

    before(function(done){
      execute('http://www.registry.com/component-name/~1.0.0/?hello=world', '~1.0.0', done);
    });

    it('componentName should be component-name', function(){
      expect(parsed.componentName).to.equal('component-name');
    });

    it('version should be blank', function(){
      expect(parsed.version).to.equal('~1.0.0');
    });

    it('registryUrl should be http://www.registry.com/', function(){
      expect(parsed.registryUrl).to.equal('http://www.registry.com/');
    });

    it('parameters should be { hello: \'world\'}', function(){
      expect(parsed.parameters).to.eql({ hello: 'world' });
    });

    it('clientHref should be http://www.registry.com/oc-client/client.js', function(){
      expect(parsed.clientHref).to.equal('http://www.registry.com/oc-client/client.js');
    });
  });
  
  describe('when parsing http://www.registry.com/12345/~1.0.0?hello=world', function(){

    before(function(done){
      execute('http://www.registry.com/12345/~1.0.0?hello=world', '~1.0.0', done);
    });

    it('componentName should be 12345', function(){
      expect(parsed.componentName).to.equal('12345');
    });

    it('version should be blank', function(){
      expect(parsed.version).to.equal('~1.0.0');
    });

    it('registryUrl should be http://www.registry.com/', function(){
      expect(parsed.registryUrl).to.equal('http://www.registry.com/');
    });

    it('parameters should be { hello: \'world\'}', function(){
      expect(parsed.parameters).to.eql({ hello: 'world' });
    });

    it('clientHref should be http://www.registry.com/oc-client/client.js', function(){
      expect(parsed.clientHref).to.equal('http://www.registry.com/oc-client/client.js');
    });
  });
});