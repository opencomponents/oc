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
      components: {
        'hello-world': '~1.0.0',
        'no-containers': ''
      }
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

    describe('when rendering 2 components', function(){
      describe('when rendering both on the server-side', function(){
        var $components;
        var $errs;
        before(function(done){
          client.renderComponents([{
            name: 'hello-world'
          }, {
            name: 'no-containers'
          }], { container: false, renderInfo: false }, function(err, html){
            $errs = err;
            $components = {
              'hello-world': html[0],
              'no-containers': html[1]
            };
            done();
          });
        });

        it('should return rendered contents', function(){
          expect($components['hello-world']).to.equal('Hello world!');
          expect($components['no-containers']).to.equal('Hello world!');
        });
        
        it('should return null errors', function () {
          expect($errs).to.be.null;
        });
      });

      describe('when rendering both on the client-side', function(){
        var $components;
        before(function(done){
          client.renderComponents([{
            name: 'hello-world'
          }, {
            name: 'no-containers'
          }], { container: false, renderInfo: false, render: 'client' }, function(err, html){
            $components = {
              'hello-world': cheerio.load(html[0])('oc-component'),
              'no-containers': cheerio.load(html[1])('oc-component')
            };
            done();
          });
        });

        it('should return browser oc tags', function(){
          expect($components['hello-world'].attr('href')).to.equal('http://localhost:3030/hello-world/~1.0.0');
          expect($components['no-containers'].attr('href')).to.equal('http://localhost:3030/no-containers');
        });
      });

      describe('when rendering one on the server, one on the client', function(){
        var $components;
        before(function(done){
          client.renderComponents([{
            name: 'hello-world',
            render: 'server'
          }, {
            name: 'no-containers',
            render: 'client'
          }], { container: false, renderInfo: false }, function(err, html){
            $components = {
              'hello-world': html[0],
              'no-containers': cheerio.load(html[1])('oc-component')
            };
            done();
          });
        });

        it('should return rendered content for rendered component', function(){
          expect($components['hello-world']).to.equal('Hello world!');
          });

        it('should return browser oc tag for unrendered component', function(){
          expect($components['no-containers'].attr('href')).to.equal('http://localhost:3030/no-containers');
        });
      });

      describe('when there\'s error in one of them', function(){
        var $errs;
        before(function(done){
          client.renderComponents([{
            name: 'hello-world-i-dont-exist'
          }, {
            name: 'no-containers'
          }], { container: false, renderInfo: false }, function(err, html){
            $errs = err;
            done();
          });
        });

        it('should return an error for the component with error', function(){
          expect($errs[0]).to.not.be.null;
          expect($errs[1]).to.be.null;
        });
      });
    });

    describe('when server-side rendering an existing component linked to a responsive registry', function(){

      before(function(done){
        client.renderComponent('hello-world', { container: true }, function(err, html){
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
          expect($component.data('rendered')).to.be.undefined;
        });

        it('should contain the component url', function(){
          expect($component.attr('href')).to.equal('http://localhost:1234/hello-world/~1.0.0');
        });

        it('should contain the error details', function(){
          expect(error).to.equal('Server-side rendering failed');
        });
      });

      describe('when client-side failover rendering enabled with forwardAcceptLanguageToClient=true', function(){

        var $componentScript,
            $clientScript,
            error,
            options = { 
              forwardAcceptLanguageToClient: true,
              parameters: {
                hi: 'john'
              },
              headers: {
                'accept-language': 'da, en-gb;q=0.8, en;q=0.7'
              }
            };

        before(function(done){
          clientOfflineRegistry.renderComponent('hello-world', options, function(err, html){
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

        it('should contain the component url including parameters and __ocAcceptLanguage parameter', function(){
          var u = 'http://localhost:1234/hello-world/~1.0.0/?hi=john&__ocAcceptLanguage=da%2C%20en-gb%3Bq%3D0.8%2C%20en%3Bq%3D0.7';
          expect($component.attr('href')).to.equal(u);
        });

        it('should contain the error details', function(){
          expect(error).to.eql('Server-side rendering failed');
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