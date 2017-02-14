'use strict';

var _ = require('underscore');
var expect = require('chai').expect;
var path = require('path');
var request = require('minimal-request');

describe('registry', function(){
  describe('when fallbackRegistryUrl is specified', function(){
    var oc = require('../../../src/index');
    var error;
    var fallbackRegistry;
    var registry;
    var result;

    function retrieveRegistryConfiguration(port, pathToComponents, fallbackRegistryUrl){
      return {
        local: true,
        path: path.resolve(pathToComponents),
        port: port,
        fallbackRegistryUrl: fallbackRegistryUrl,
        baseUrl: 'http://localhost:' + port + '/',
        env: { name: 'local' },
        verbosity: 0,
        dependencies: ['underscore']
      };
    }

    function next(done){
      return function(e, r){
        error = e;
        result = r;
        done();
      };
    }

    before(function(done){
      registry = new oc.Registry(retrieveRegistryConfiguration(3030, 'test/fixtures/components', 'http://localhost:3031'));
      fallbackRegistry = new oc.Registry(retrieveRegistryConfiguration(3031, 'test/fixtures/fallback-registry-components'));
      registry.start(function(){
        fallbackRegistry.start(done);
      });
    });

    after(function(done){
      registry.close(function(){
        fallbackRegistry.close(done);
      });
    });

    describe('GET /welcome', function(){

      before(function(done){
        request({
          url: 'http://localhost:3030/welcome',
          json: true
        }, next(done));
      });

      it('should respond with the local registry url', function(){
        expect(result.href).to.eql('http://localhost:3030/welcome');
      });

      it('should respond the `Hello world!` html', function(){
        expect(result.html).to.equal('<span>hi John Doe  </span>');
      });
    });

    describe('GET /fallback-hello-world', function(){

      before(function(done){
        request({
          url: 'http://localhost:3030/fallback-hello-world',
          json: true
        }, next(done));
      });

      it('should respond with the fallback registry url', function(){
        expect(result.href).to.eql('http://localhost:3031/fallback-hello-world');
      });

      it('should respond the `Hello world!` html', function(){
        expect(result.html).to.equal('Hello world!');
      });
    });
  });
});