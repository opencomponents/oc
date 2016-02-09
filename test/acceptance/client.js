'use strict';

var cheerio = require('cheerio');
var expect = require('chai').expect;
var path = require('path');

describe('The node.js OC client', function(){

  var registry,
      client,
      clientOfflineRegistry,
      result,
      oc = require('../../index'),
      $component,
      conf = {          
        local: true,
        path: path.resolve('test/fixtures/components'),
        port: 3030,
        baseUrl: 'http://localhost:3030/',
        env: { name: 'local' },
        verbosity: 0
      };

  var getClientConfig = function(port){
    return {
      registries: {
        clientRendering: 'http://localhost:' + port,
        serverRendering: 'http://localhost:' + port
      },
      components: {'hello-world': '~1.0.0'}
    };
  };

  describe('when initialised providing registries properties', function(){

    before(function(done){
      client = new oc.Client(getClientConfig(3030));
      clientOfflineRegistry = new oc.Client(getClientConfig(1234));
      registry = new oc.Registry(conf);
      registry.start(done);
    });

    after(function(done){ registry.close(done); });

    describe('when server-side rendering an existing component linked to a responsive registry', function(){

      before(function(done){
        client.renderComponent('hello-world', { container: true }, function(err, html){ console.log(arguments);
          $component = cheerio.load(html)('oc-component');
          done();
        });
      });

      it('should use the serverRendering url', function(){
        expect($component.attr('href')).to.equal('http://localhost:3030/hello-world/~1.0.0');
        expect($component.data('rendered')).to.equal(true);
      });
    });

    describe('when client-side rendering an existing component', function(){

      before(function(done){
        clientOfflineRegistry.renderComponent('hello-world', { render: 'client' }, function(err, html){
          $component = cheerio.load(html)('oc-component');
          done();
        });
      });

      it('should use clientRendering url', function(){
        expect($component.attr('href')).to.equal('http://localhost:1234/hello-world/~1.0.0');
      });
    });
  });

  describe('when correctly initialised', function(){

    before(function(done){
      client = new oc.Client(getClientConfig(3030));
      clientOfflineRegistry = new oc.Client(getClientConfig(1234));
      registry = new oc.Registry(conf);
      registry.start(done);
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

        var $clientScript,
            error;

        before(function(done){
          clientOfflineRegistry.renderComponent('hello-world', function(err, html){
            error = err;
            var $ = cheerio.load(html);
            $component = $('oc-component');
            $clientScript = $('script.ocClientScript');
            done();
          });
        });

        it('should include the client-side rendering script', function(){
          expect($clientScript).to.have.length.above(0);
        });

        it('should return non rendered contents', function(){
          expect($component).to.exist();
          expect($component.data('rendered')).to.equal(false);
        });

        it('should contain the component url', function(){
          expect($component.attr('href')).to.equal('http://localhost:1234/hello-world/~1.0.0');
        });

        it('should contain the error details', function(){
          expect(error).to.equal('Server-side rendering failed');
        });
      });

      describe('when client-side failover rendering enabled with ie8=true', function(){

        var $componentScript,
            $clientScript,
            error,
            options = { ie8: true };

        before(function(done){
          clientOfflineRegistry.renderComponent('hello-world', options, function(err, html){
            error = err;
            var $ = cheerio.load(html);
            $componentScript = $('script.ocComponent');
            $clientScript = $('script.ocClientScript');
            done();
          });
        });

        it('should include the client-side rendering script', function(){
          expect($clientScript).to.have.length.above(0);
        });

        it('should include the non rendered scripted component', function(){
          expect($componentScript).to.have.length.above(0);
        });

        it('should contain the component url', function(){
          expect($componentScript.toString()).to.contain('http://localhost:1234/hello-world/~1.0.0');
        });

        it('should contain the error details', function(){
          expect(error).to.eql('Server-side rendering failed');
        });
      });
    });

    describe('when server-side rendering an existing component linked to a responsive registry', function(){

      describe('when container option = true', function(){
        before(function(done){
          client.renderComponent('hello-world', { container: true }, function(err, html){
            $component = cheerio.load(html)('oc-component');
            done();
          });
        });

        it('should return rendered contents', function(){
          expect($component).to.exist();
          expect($component.data('rendered')).to.eql(true);
        });

        it('should contain the hashed view\'s key', function(){
          expect($component.data('hash')).to.equal('46ee85c314b371cac60471cef5b2e2e6c443dccf');
        });

        it('should return expected html', function(){
          expect($component.text()).to.contain('Hello world!');
        });

        it('should contain the component version', function(){
          expect($component.data('version')).to.equal('1.0.0');
        });
      });

      describe('when container option = false', function(){
        before(function(done){
          client.renderComponent('hello-world', { container: false, renderInfo: false }, function(err, html){
            result = html;
            done();
          });
        });

        it('should return expected html without the container', function(){
          expect(result).to.equal('Hello world!');
        });
      });
    });
  });
});