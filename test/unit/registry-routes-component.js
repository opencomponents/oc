'use strict';

var expect = require('chai').expect;
var sinon = require('sinon');
var _ = require('underscore');

describe('registry : routes : component', function(){

  var ComponentRoute = require('../../registry/routes/component'),
      mockedComponents = require('../fixtures/mocked-components'),
      mockedRepository, resJsonStub, componentRoute;
  
  var initialise = function(params){
    resJsonStub = sinon.stub();
    mockedRepository = {
      getCompiledView: sinon.stub().yields(null, params.view),
      getComponent: sinon.stub().yields(null, params.package),
      getDataProvider: sinon.stub().yields(null, params.data),
      getStaticFilePath: sinon.stub().returns('//my-cdn.com/files/')
    };
  };

  describe('when getting a component with server.js execution timeout', function(){

    var code, response;
    before(function(done){
      initialise(mockedComponents['timeout-component']);
      componentRoute = new ComponentRoute({}, mockedRepository);

      var resJson = function(calledCode, calledResponse){
        code = calledCode;
        response = calledResponse;
        done();
      };

      componentRoute({
        headers: {},
        params: { componentName: 'timeout-component' }
      }, {
        conf: {
          baseUrl: 'http://component.com/',
          executionTimeout: 0.1
        },
        json: resJson
      });
    });

    it('should return 500 status code', function(){
      expect(code).to.be.equal(500);
    });

    it('should respond with error message', function(){
      expect(response.error).to.equal('Component execution error: timeout (100ms)');
    });
  });

  describe('when getting a component with a server.js that returns undefined data', function(){

    before(function(){
      initialise(mockedComponents['undefined-component']);
      componentRoute = new ComponentRoute({}, mockedRepository);

      componentRoute({
        headers: {},
        params: { componentName: 'undefined-component' }
      }, {
        conf: {
          baseUrl: 'http://components.com/'
        },
        json: resJsonStub
      });
    });

    it('should return 500 status code', function(){
      expect(resJsonStub.args[0][0]).to.be.equal(500);
    });

    it('should respond with error message for undefined data', function(){
      expect(resJsonStub.args[0][1].error).to.equal('Component execution error: data object is undefined');
    });
  });

  describe('when getting a component with server.js execution errors', function(){

    before(function(){
      initialise(mockedComponents['error-component']);
      componentRoute = new ComponentRoute({}, mockedRepository);

      componentRoute({
        headers: {},
        params: { componentName: 'error-component' }
      }, {
        conf: {
          baseUrl: 'http://components.com/',
          plugins: {
            a: function(){ return ''; }
          }
        },
        json: resJsonStub
      });
    });

    it('should return 500 status code', function(){
      expect(resJsonStub.args[0][0]).to.be.equal(500);
    });

    it('should respond with error message including missing plugin', function(){
      expect(resJsonStub.args[0][1].error).to.equal('Component execution error: c is not defined');
    });
  });

  describe('when getting a component with server.js asynchronous execution errors', function(){

    describe('when has error that gets fired on first execution', function(){

      var code, response;
      before(function(done){
        initialise(mockedComponents['async-error-component']);
        componentRoute = new ComponentRoute({}, mockedRepository);

        var resJson = function(calledCode, calledResponse){
          code = calledCode;
          response = calledResponse;
          done();
        };

        componentRoute({
          headers: {},
          params: { componentName: 'async-error-component' }
        }, {
          conf: {
            baseUrl: 'http://components.com/',
            plugins: {}
          },
          json: resJson
        });
      });

      it('should return 500 status code', function(){
        expect(code).to.be.equal(500);
      });

      it('should respond with error message for component execution error', function(){
        expect(response.error).to.equal('Component execution error: thisDoesnotExist is not defined');
      });
    });

    describe('when has error that gets fired on following executions', function(){

      var codes = [],
          responses = [];
      before(function(done){
        initialise(mockedComponents['async-error2-component']);
        componentRoute = new ComponentRoute({}, mockedRepository);

        var resJson = function(calledCode, calledResponse){
          codes.push(calledCode);
          responses.push(calledResponse);
          if(codes.length === 2){
            done();
          }
        };

        componentRoute({
          headers: {},
          params: { componentName: 'async-error2-component' }
        }, {
          conf: {
            baseUrl: 'http://components.com/',
            plugins: {}
          },
          json: resJson
        });

        componentRoute({
          headers: {},
          params: { componentName: 'async-error2-component' },
          query: { error: true }
        }, {
          conf: {
            baseUrl: 'http://components.com/',
            plugins: {}
          },
          json: resJson
        });
      });

      it('should return 200 status code for successful request', function(){
        expect(codes[0]).to.be.equal(200);
      });

      it('should return 500 status code when error happens', function(){
        expect(codes[1]).to.be.equal(500);
      });

      it('should respond without error for successful request', function(){
        expect(responses[0].error).to.be.empty;
      });

      it('should respond with error message for component execution error', function(){
        expect(responses[1].error).to.equal('Component execution error: thisDoesnotExist is not defined');
      });
    });
  });

  describe('when getting a component that implements a plugin', function(){

    describe('when plugin not declared in package.json', function(){

      before(function(){
        initialise(mockedComponents['plugin-component']);
        componentRoute = new ComponentRoute({}, mockedRepository);

        componentRoute({
          headers: {},
          params: { componentName: 'plugin-component' }
        }, {
          conf: {
            baseUrl: 'http://components.com/',
            plugins: {}
          },
          json: resJsonStub
        });
      });

      it('should return 501 status code', function(){
        expect(resJsonStub.args[0][0]).to.be.equal(501);
      });

      it('should respond with PLUGIN_MISSING_FROM_COMPONENT error code', function(){
        expect(resJsonStub.args[0][1].code).to.equal('PLUGIN_MISSING_FROM_COMPONENT');
      });

      it('should respond with error message including missing plugin', function(){
        expect(resJsonStub.args[0][1].error).to.equal('Component is trying to use un-registered plugins: doSomething');
      });
    });

    describe('when plugin declared in package.json', function(){

      beforeEach(function(){
        var component = _.clone(mockedComponents['plugin-component']);
        component.package.oc.plugins = ['doSomething'];
        initialise(component);
        componentRoute = new ComponentRoute({}, mockedRepository);
      });

      describe('when registry implements plugin', function(){

        beforeEach(function(){
          componentRoute({
            headers: {},
            params: { componentName: 'plugin-component' }
          }, {
            conf: {
              baseUrl: 'http://components.com/',
              plugins: {
                doSomething: function(){ return 'hello hello hello my friend'; }
              }
            },
            json: resJsonStub
          });
        });

        it('should return 200 status code', function(){
          expect(resJsonStub.args[0][0]).to.be.equal(200);
        });

        it('should use plugin inside compiledView', function(){
          expect(resJsonStub.args[0][1].html).to.contain('hello hello hello my friend John');
        });
      });

      describe('when registry does not implement plugin', function(){

        beforeEach(function(){
          componentRoute({
            headers: {},
            params: { componentName: 'plugin-component' }
          }, {
            conf: { baseUrl: 'http://components.com/' },
            json: resJsonStub
          });
        });

        it('should return 501 status code', function(){
          expect(resJsonStub.args[0][0]).to.be.equal(501);
        });

        it('should respond with PLUGIN_MISSING_FROM_REGISTRY error code', function(){
          expect(resJsonStub.args[0][1].code).to.equal('PLUGIN_MISSING_FROM_REGISTRY');
        });

        it('should respond with error message including missing plugin', function(){
          expect(resJsonStub.args[0][1].error).to.equal('registry does not implement plugins: doSomething');
        });
      });
    });
  });

  describe('when getting a component that requires a npm module', function(){

    describe('when registry implements dependency', function(){

      beforeEach(function(){
        initialise(mockedComponents['npm-component']);
        componentRoute = new ComponentRoute({}, mockedRepository);

        componentRoute({
          headers: {},
          params: { componentName: 'npm-component' }
        }, {
          conf: {
            local: true, //needed to invalidate the cache
            baseUrl: 'http://components.com/',
            plugins: {},
            dependencies: {
              underscore: require('underscore')
            }
          },
          json: resJsonStub
        });
      });
  
      it('should return 200 status code', function(){
        expect(resJsonStub.args[0][0]).to.be.equal(200);
      });

      it('should use plugin inside compiledView', function(){
        expect(resJsonStub.args[0][1].html).to.contain('bye John');
      });
    });

    describe('when registry does not implement dependency', function(){

      beforeEach(function(){
        initialise(mockedComponents['npm-component']);
        componentRoute = new ComponentRoute({}, mockedRepository);

        componentRoute({
          headers: {},
          params: { componentName: 'npm-component' }
        }, {
          conf: {
            local: true, //needed to invalidate the cache
            baseUrl: 'http://components.com/',
            plugins: {},
            dependencies: {}
          },
          json: resJsonStub
        });
      });

      it('should return 501 status code', function(){
        expect(resJsonStub.args[0][0]).to.be.equal(501);
      });

      it('should respond with DEPENDENCY_MISSING_FROM_REGISTRY error code', function(){
        expect(resJsonStub.args[0][1].code).to.equal('DEPENDENCY_MISSING_FROM_REGISTRY');
      });

      it('should respond with error message including missing dependency', function(){
        expect(resJsonStub.args[0][1].error).to.equal('Component is trying to use unavailable dependencies: underscore');
      });
    });
  });
});