'use strict';

var cheerio = require('cheerio');
var expect = require('chai').expect;
var injectr = require('injectr');
var sinon = require('sinon');

describe('client', function(){

  var readFileStub,
      requestStub,
      validatorStub,
      client,
      Client,
      init,
      response,
      error;

  var initialise = function(){
    requestStub = sinon.stub();
    validatorStub = sinon.stub();
    readFileStub = sinon.stub();

    Client = injectr('../../client/src/index.js', {
      fs: { readFile: readFileStub },
      './utils/request': requestStub,
      './validator': { validateConfiguration: validatorStub }
    }, { __dirname: '/something/' });
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

    client = new Client({
      registries: endpoints,
      components: {
        hello: '1.2.3'
      }
    });
    fn();
  };

  describe('when not correctly initialised', function(){    
    before(function(){
      initialise();
      validatorStub.returns({ isValid: false, error: 'argh!' });
      init = function(){ client = new Client(); };
    });

    it('should throw an exception', function(){
      expect(init).to.throw('argh!');
    });
  });

  describe('when initialised with client-side rendering endpoint only', function(){
    describe('when rendering the component on the client-side', function(){
      describe('when client-side failover enabled', function(){
        before(function(done){
          initialise();

          validatorStub.returns({ isValid: true });
          requestStub.onCall(0).yields('error');
          readFileStub.yields(null, 'document.write("hi");');

          executeWithClientEndpointOnly(function(){
            client.renderComponent('hello', {
              headers: { 'accept-language': 'es-MX' },
              params: { name: 'matt'},
              render: 'client'
            }, function(err, res){
              error = err;
              response = res;
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

          validatorStub.returns({ isValid: true });
          requestStub.onCall(0).yields('error');
          readFileStub.yields(null, 'document.write("hi");');

          executeWithClientEndpointOnly(function(){
            client.renderComponent('hello', {
              headers: { 'accept-language': 'es-MX' },
              params: { name: 'matt'},
              disableFailoverRendering: true,
              render: 'client'
            }, function(err, res){
              error = err;
              response = res;
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

          validatorStub.returns({ isValid: true });
          requestStub.onCall(0).yields('error');
          readFileStub.yields(null, 'document.write("hi");');

          executeWithClientEndpointOnly(function(){
            client.renderComponent('hello', {
              headers: { 'accept-language': 'es-MX' },
              params: { name: 'matt'}
            }, function(err, res){
              error = err;
              response = res;
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

          validatorStub.returns({ isValid: true });
          requestStub.onCall(0).yields('error');
          readFileStub.yields(null, 'document.write("hi");');

          executeWithClientEndpointOnly(function(){
            client.renderComponent('hello', {
              headers: { 'accept-language': 'es-MX' },
              params: { name: 'matt'},
              disableFailoverRendering: true
            }, function(err, res){
              error = err;
              response = res;
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

        validatorStub.returns({ isValid: true });
        requestStub.onCall(0).yields('error');
        readFileStub.yields(null, 'document.write("hi");');

        executeWithServerEndpointOnly(function(){
          client.renderComponent('hello', {
            headers: { 'accept-language': 'es-MX' },
            params: { name: 'matt'}
          }, function(err, res){
            error = err;
            response = res;
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

  describe('when correctly initialised', function(){
    before(function(){
      initialise();
      validatorStub.returns({ isValid: true });
    });

    describe('when rendering component on the server-side', function(){

      describe('when server-side rendering fails', function(){
      
        describe('when client-side failover is enabled', function(){
          before(function(done){
            initialise();

            validatorStub.returns({ isValid: true });
            requestStub.onCall(0).yields(null, JSON.stringify({
              data: { name: 'john'},
              name: 'hello',
              template: {
                key: 'hash',
                src: 'https://cdn.com/template.js',
                type: 'jade'
              }
            }));
            requestStub.onCall(1).yields('error');
            readFileStub.yields(null, 'document.write("hi");');

            execute(function(){
              client.renderComponent('hello', {
                headers: { 'accept-language': 'es-MX' },
                params: { name: 'matt'}
              }, function(err, res){
                response = res;
                done();
              });
            });
          });

          it('should make server-side request using serverRendering baseUrl', function(){
            expect(requestStub.args[0][0].url).to.equal('http://components.company.com/hello/1.2.3/?name=matt');
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

            validatorStub.returns({ isValid: true });
            requestStub.onCall(0).yields('error');
            readFileStub.yields(null, 'document.write("hi");');

            execute(function(){
              client.renderComponent('hello', {
                headers: { 'accept-language': 'es-MX' },
                params: { name: 'matt'},
                disableFailoverRendering: true
              }, function(err, res){
                response = res;
                done();
              });
            });
          });

          it('should make server-side request using serverRendering baseUrl', function(){
            expect(requestStub.args[0][0].url).to.equal('http://components.company.com/hello/1.2.3/?name=matt');
          });

          it('shouldn\'t make client-side failover request', function(){
            expect(requestStub.calledOnce).to.be.true;
          });
        });
      });  
    });
  });
});