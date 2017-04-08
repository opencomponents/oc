'use strict';

const expect = require('chai').expect;

describe('cli : domain : url-parser', function(){

  let parsed;
  const execute = function(url, returnVersion){
    const urlParser = require('../../src/cli/domain/url-parser');

    parsed = urlParser.parse({
      href: url,
      requestVersion: returnVersion
    });
  };
  
  describe('when parsing http://www.registry.com/api/v2/component-name', function(){

    before(function(){
      execute('http://www.registry.com/api/v2/component-name', '');
    });

    it('name should be component-name', function(){
      expect(parsed.name).to.equal('component-name');
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

    before(function(){
      execute('http://www.registry.com/component-name/~1.0.0/?hello=world', '~1.0.0');
    });

    it('name should be component-name', function(){
      expect(parsed.name).to.equal('component-name');
    });

    it('version should be ~1.0.0', function(){
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

    before(function(){
      execute('http://www.registry.com/12345/~1.0.0?hello=world', '~1.0.0');
    });

    it('name should be 12345', function(){
      expect(parsed.name).to.equal('12345');
    });

    it('version should be ~1.0.0', function(){
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