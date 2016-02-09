'use strict';

var cheerio = require('cheerio');
var expect = require('chai').expect;
var injectr = require('injectr');
var sinon = require('sinon');

describe('client : components-renderer', function(){

  var getCompiledTemplateStub,
      getOcClientStub,
      requestStub,
      render,
      Renderer,
      init,
      response,
      error,
      templateRendererStub;

  var initialise = function(){

    getCompiledTemplateStub = sinon.stub();
    getOcClientStub = sinon.stub();
    requestStub = sinon.stub();
    templateRendererStub = sinon.stub();

    Renderer = injectr('../../client/src/components-renderer.js', {
      './get-compiled-template': function(){ return getCompiledTemplateStub; },
      './get-oc-client-script': function(){ return getOcClientStub; },
      './utils/request': requestStub
    }, { __dirname: '/something/', console: console });
  };

  var executeWithServerEndpointOnly = function(fn){
    return execute({ serverRendering: 'http://components.company.com' }, fn);
  };

  var executeWithClientEndpointOnly = function(fn){
    return execute({ clientRendering: 'https://components.com/' }, fn);
  };

  var execute = function(endpoints, fn){
    if(typeof(endpoints) === 'function'){
      fn = endpoints;
      endpoints = {
        clientRendering: 'https://components.com/',
        serverRendering: 'http://components.company.com'
      };
    }

    render = new Renderer({
      registries: endpoints,
      components: {
        hello: '1.2.3',
        world: '4.5.6'
      }
    }, templateRendererStub);
    fn();
  };

  describe('when initialised with client-side rendering endpoint only', function(){
    describe('when rendering the component on the client-side', function(){
      describe('when client-side failover enabled', function(){
        before(function(done){
          initialise();

          requestStub.onCall(0).yields('error');
          getOcClientStub.yields(null, 'document.write("hi");');

          executeWithClientEndpointOnly(function(){
            render([{
              name: 'hello', 
              parameters: { name: 'matt'}
            }],{
              headers: { 'accept-language': 'es-MX' },
              render: 'client'
            }, function(err, res){
              error = err[0];
              response = res[0];
              done();
            });
          });
        });

        it('should include client-side tag using clientRendering baseUrl', function(){
          var $ocComponent = cheerio.load(response)('oc-component');
          expect($ocComponent.attr('href')).to.equal('https://components.com/hello/1.2.3/?name=matt');
        });

        it('should not include oc-client javascript library', function(){
          var $script = cheerio.load(response)('script');
          expect($script.length).to.be.empty;
        });

        it('should not respond with error', function(){
          expect(error).to.be.null;
        });
      });

      describe('when client-side failover disabled', function(){
        before(function(done){
          initialise();

          requestStub.onCall(0).yields('error');
          getOcClientStub.yields(null, 'document.write("hi");');

          executeWithClientEndpointOnly(function(){
            render([{
              name: 'hello',
              parameters: { name: 'matt'}
            }],{
              headers: { 'accept-language': 'es-MX' },
              disableFailoverRendering: true,
              render: 'client'
            }, function(err, res){
              error = err[0];
              response = res[0];
              done();
            });
          });
        });

        it('should include client-side tag using clientRendering baseUrl', function(){
          var $ocComponent = cheerio.load(response)('oc-component');
          expect($ocComponent.attr('href')).to.equal('https://components.com/hello/1.2.3/?name=matt');
        });

        it('should not include oc-client javascript library', function(){
          var $script = cheerio.load(response)('script');
          expect($script.length).to.be.empty;
        });

        it('should not respond with error', function(){
          expect(error).to.be.null;
        });
      });
    });

    describe('when rendering the component on the server-side', function(){
      describe('when client-side failover enabled', function(){
        before(function(done){
          initialise();

          requestStub.onCall(0).yields('error');
          getOcClientStub.yields(null, 'document.write("hi");');

          executeWithClientEndpointOnly(function(){
            render([{
              name: 'hello',
              parameters: { name: 'matt'}
            }], {
              headers: { 'accept-language': 'es-MX' }
            }, function(err, res){
              error = err[0];
              response = res[0];
              done();
            });
          });
        });

        it('should include client-side failover tag using clientRendering baseUrl', function(){
          var $ocComponent = cheerio.load(response)('oc-component');
          expect($ocComponent.attr('href')).to.equal('https://components.com/hello/1.2.3/?name=matt');
        });

        it('should include oc-client javascript library', function(){
          var $script = cheerio.load(response)('script');
          expect($script.text()).to.equal('document.write("hi");');
        });

        it('should respond with error', function(){
          expect(error).to.equal('Server-side rendering failed');
        });
      });

      describe('when client-side failover disabled', function(){
        before(function(done){
          initialise();

          requestStub.onCall(0).yields('error');
          getOcClientStub.yields(null, 'document.write("hi");');

          executeWithClientEndpointOnly(function(){
            render([{
              name: 'hello',
              parameters: { name: 'matt'}
            }], {
              headers: { 'accept-language': 'es-MX' },
              disableFailoverRendering: true
            }, function(err, res){
              error = err[0];
              response = res[0];
              done();
            });
          });
        });

        it('should respond with error', function(){
          expect(error).to.equal('Server-side rendering failed');
        });

        it('should respond with blank html content', function(){
          expect(response).to.be.empty;
        });
      });
    });
  });

  describe('when initialised with server-side rendering endpoint only', function(){
    describe('when rendering the component on the server fails', function(){
      before(function(done){
        initialise();

        requestStub.onCall(0).yields('error');
        getOcClientStub.yields(null, 'document.write("hi");');

        executeWithServerEndpointOnly(function(){
          render([{
            name: 'hello',
            parameters: { name: 'matt'}
          }], {
            headers: { 'accept-language': 'es-MX' }
          }, function(err, res){
            error = err[0];
            response = res[0];
            done();
          });
        });
      });

      it('should respond with error', function(){
        expect(error).to.equal('Server-side rendering failed');
      });

      it('should respond with blank html content', function(){
        expect(response).to.be.empty;
      });
    });
  });

  describe('when correctly initialised with both client and server-side rendering endpoints', function(){
    
    describe('when rendering multiple components on the server-side', function(){

      before(function(done){
        initialise();

        requestStub.onCall(0).yields(null, [{
          status: 200,
          response: {
            name: 'hello',
            version: '1.2.3',
            href: 'http://components.company.com/hello/1.2.3/?name=jane',
            data: { name: 'jane' },
            template: {
              src: 'https://cdn.com/hello/template.js',
              key: 'hash1',
              type: 'jade'
            }
          }
        },{
          status: 200,
          response: {
            name: 'world',
            version: '4.5.6',
            href: 'http://components.company.com/world/4.5.6',
            data: { name: 'john' },
            template: {
              src: 'https://cdn.com/world/template.js',
              key: 'hash2',
              type: 'jade'
            }
          }
        }]);

        getCompiledTemplateStub.onCall(0).yields(null, 'first template');
        getCompiledTemplateStub.onCall(1).yields(null, 'second template');
        templateRendererStub.onCall(0).yields(null, '<div>hello</div>');
        templateRendererStub.onCall(1).yieldsAsync(null, '<p>world</p>');
        getOcClientStub.yields(null, 'document.write("hi");');

        execute(function(){
          render([{
            name: 'hello',
            parameters: { name: 'jane' }  
          },
          {
            name: 'world'
          }], {}, function(err, res){
            response = res;
            done();
          });
        });
      });

      it('should respond with 2 components', function(){
        expect(response.length).to.equal(2);
      });

      it('should respond with components in the right order', function(){
        expect(response[0]).to.equal('<div>hello</div>');
        expect(response[1]).to.equal('<p>world</p>');
      });
    });

    describe('when rendering multiple components with mixed rendering modes', function(){

      before(function(done){
        initialise();

        requestStub.onCall(0).yields(null, [{
          status: 200,
          response: {
            name: 'hello',
            version: '1.2.3',
            href: 'http://components.company.com/hello/1.2.3/?name=jane',
            data: { name: 'jane' },
            template: {
              src: 'https://cdn.com/hello/template.js',
              key: 'hash1',
              type: 'jade'
            }
          }
        },{
          status: 200,
          response: {
            name: 'world',
            version: '4.5.6',
            href: 'http://components.company.com/world/4.5.6',
            data: { name: 'john' },
            template: {
              src: 'https://cdn.com/world/template.js',
              key: 'hash2',
              type: 'jade'
            }
          }
        }]);

        getCompiledTemplateStub.onCall(0).yields(null, 'first template');
        templateRendererStub.onCall(0).yields(null, '<div>hello</div>');
        getOcClientStub.yields(null, 'document.write("hi");');

        execute(function(){
          render([{
            name: 'hello',
            parameters: { name: 'jane' }  
          },
          {
            name: 'world',
            render: 'client'
          }], {}, function(err, res){
            response = res;
            done();
          });
        });
      });

      it('should respond with 2 components', function(){
        expect(response.length).to.equal(2);
      });

      it('should respond with components in the right order', function(){
        expect(response[0]).to.equal('<div>hello</div>');
        expect(response[1]).to.equal('<oc-component href="https://components.com/world/4.5.6"></oc-component>');
      });
    });

    describe('when rendering component on the server-side', function(){

      describe('when server-side rendering fails', function(){
      
        describe('when client-side failover is enabled', function(){
          before(function(done){
            initialise();

            requestStub.onCall(0).yields([null], [{
              status: 200,
              response: {
                data: { name: 'john'},
                name: 'hello',
                template: {
                  key: 'hash',
                  src: 'https://cdn.com/template.js',
                  type: 'jade'
                },
                version: '1.2.3'
              }
            }]);

            requestStub.onCall(1).yields('error');
            getOcClientStub.yields(null, 'document.write("hi");');
            getCompiledTemplateStub.yields('error');

            execute(function(){
              render([{
                name: 'hello',
                parameters: { name: 'matt'}
              }], {
                headers: { 'accept-language': 'es-MX' }
              }, function(err, res){
                response = res[0];
                done();
              });
            });
          });

          it('should make server-side request using serverRendering baseUrl', function(){
            expect(requestStub.args[0][0].url).to.equal('http://components.company.com');
          });

          it('should make post request', function(){
            expect(requestStub.args[0][0].method).to.equal('post');
          });

          it('should make request with correct payload', function(){
            expect(requestStub.args[0][0].body).to.eql({
              components: [{
                name: 'hello',
                parameters: { name: 'matt' },
                version: '1.2.3'
              }]
            });
          });

          it('should make request forwarding the allowed headers', function(){
            expect(requestStub.args[0][0].headers['accept-language']).to.equal('es-MX');
          });

          it('should make request for unrendered component', function(){
            expect(requestStub.args[0][0].headers.accept).to.equal('application/vnd.oc.unrendered+json');
          });

          it('should include client-side failover tag using clientRendering baseUrl', function(){
            var $ocComponent = cheerio.load(response)('oc-component');
            expect($ocComponent.attr('href')).to.equal('https://components.com/hello/1.2.3/?name=matt');
          });

          it('should include oc-client javascript library', function(){
            var $script = cheerio.load(response)('script');
            expect($script.text()).to.equal('document.write("hi");');
          });
        });

        describe('when client-side failover is disabled', function(){
          before(function(done){
            initialise();

            requestStub.onCall(0).yields('error');
            getOcClientStub.yields(null, 'document.write("hi");');

            execute(function(){
              render([{
                name: 'hello',
                params: { name: 'matt'}
              }], {
                headers: { 'accept-language': 'es-MX' },
                disableFailoverRendering: true
              }, function(err, res){
                response = res[0];
                error = err[0];
                done();
              });
            });
          });

          it('should make server-side request using serverRendering baseUrl', function(){
            expect(requestStub.args[0][0].url).to.equal('http://components.company.com');
          });

          it('shouldn\'t make client-side failover request', function(){
            expect(requestStub.calledOnce).to.be.true;
          });

          it('should include error', function(){
            expect(error).to.be.equal('Server-side rendering failed');
          });

          it('should include blank response', function(){
            expect(response).to.be.empty;
          });
        });
      });  
    });
  });
});