'use strict';

var cheerio = require('cheerio');
var expect = require('chai').expect;
var path = require('path');

describe('client', function(){

  var registry,
      client,
      clientOfflineRegistry,
      result,
      oc = require('../../index'),
      conf = {          
        local: true,
        path: path.resolve('test/fixtures/components'),
        port: 3030,
        baseUrl: 'http://localhost:3030/',
        env: { name: 'local' },
        verbosity: 0
      };

  before(function(done){
    client = new oc.Client();
    registry = new oc.Registry(conf);
    clientOfflineRegistry = new oc.Client();

    client.config = {
      registries: ['http://localhost:3030'],
      components: {
        'hello-world': '~1.0.0'
      }
    };

    clientOfflineRegistry.config = {
      registries: ['http://localhost:1234'],
      components: {
        'hello-world': '~1.0.0'
      }
    };

    registry.start(function(err, app){
      done();
    });
  });

  after(function(done){
    registry.close(done);
  });

  describe('when server-side rendering an existing component linked to a non responsive registry', function(){

    describe('when client-side failover rendering disabled', function(){

      var error;

      before(function(done){
        var options = { disableFailoverRendering: true };

        clientOfflineRegistry.renderComponent('hello-world', options, function(err, html){
          result = html;
          error = err;
          done();
        });
      });

      it('should contain a blank html response', function(){
        expect(result).to.eql('');
      });

      it('should contain the error details', function(){
        expect(error).to.eql('Server-side rendering failed');
      });
    });

    describe('when client-side failover rendering enabled (default)', function(){

      var $component,
          error;

      before(function(done){
        clientOfflineRegistry.renderComponent('hello-world', function(err, html){
          result = html;
          error = err;
          var $ = cheerio.load(result);
          $component = $('oc-component');
          done();
        });
      });

      it('should return non rendered contents', function(){
        expect($component).to.exist();
        expect($component.data('rendered')).to.eql(false);
      });

      it('should contain the component version', function(){
        expect($component.attr('href')).to.eql('http://localhost:1234/hello-world/~1.0.0');
      });

      it('should contain the error details', function(){
        expect(error).to.eql('Server-side rendering failed');
      });
    });
  });

  describe('when server-side rendering an existing component linked to a responsive registry', function(){

    var $component;

    before(function(done){
      client.renderComponent('hello-world', function(err, html){
        result = html;
        var $ = cheerio.load(result);
        $component = $('oc-component');
        done();
      });
    });

    it('should return rendered contents', function(){
      expect($component).to.exist();
      expect($component.data('rendered')).to.eql(true);
    });

    it('should contain the hashed view\'s key', function(){
      expect($component.data('hash')).to.eql('18e2619ff1d06451883f21656affd4c6f02b1ed1');
    });

    it('should return expected html', function(){
      expect($component.text()).to.eql('Hello world!');
    });

    it('should contain the component version', function(){
      expect($component.data('version')).to.eql('1.0.0');
    });
  });
});