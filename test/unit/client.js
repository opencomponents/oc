'use strict';

var cheerio = require('cheerio');
var expect = require('chai').expect;
var injectr = require('injectr');
var sinon = require('sinon');

describe.only('client', function(){

  var readFileStub,
      requestStub,
      validatorStub,
      client,
      Client,
      init,
      response;

  var initialise = function(){
    requestStub = sinon.stub();
    validatorStub = sinon.stub();
    readFileStub = sinon.stub();

    Client = injectr('../../client/src/index.js', {
      fs: { readFile: readFileStub },
      './utils/request': requestStub,
      './validator': { validateConfiguration: validatorStub }
    }, { console: console, __dirname: '/something/' });
  };

  var execute = function(fn){
    client = new Client({
      registries: {
        clientRendering: 'https://components.com/',
        serverRendering: 'http://components.company.com'
      },
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
            expect(requestStub.args[0][0]).to.equal('http://components.company.com/hello/1.2.3/?name=matt');
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
            expect(requestStub.args[0][0]).to.equal('http://components.company.com/hello/1.2.3/?name=matt');
          });

          it('shouldn\'t make client-side failover request', function(){
            expect(requestStub.calledOnce).to.equal(true);
          });
        });
      });  
    });
  });
});