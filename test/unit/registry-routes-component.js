'use strict';

var expect = require('chai').expect;
var sinon = require('sinon');
var _ = require('underscore');

describe('registry : routes : component', function(){

  var ComponentRoute = require('../../src/registry/routes/component'),
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

      var resStatus = function(calledCode){
        code = calledCode;
        return {
          json: function(calledResponse){
            response = calledResponse;
            done();
          }
        }
      };

      componentRoute({
        headers: {},
        params: { componentName: 'timeout-component', componentVersion: '1.X.X' }
      }, {
        conf: {
          baseUrl: 'http://component.com/',
          executionTimeout: 0.1
        },
        status: resStatus
      });
    });

    it('should return 500 status code', function(){
      expect(code).to.be.equal(500);
    });

    it('should respond with error message', function(){
      expect(response.error).to.equal('Component execution error: timeout (100ms)');
    });

    it('should return component\'s name and request version', function(){
      expect(response.name).to.equal('timeout-component');
      expect(response.requestVersion).to.equal('1.X.X');
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

    it('should return component\'s name and request version', function(){
      expect(resJsonStub.args[0][1].name).to.equal('undefined-component');
      expect(resJsonStub.args[0][1].requestVersion).to.equal('');
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

    it('should return component\'s name and request version', function(){
      expect(resJsonStub.args[0][1].name).to.equal('error-component');
      expect(resJsonStub.args[0][1].requestVersion).to.equal('');
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

      it('should return component\'s name and request version', function(){
        expect(response.name).to.equal('async-error-component');
        expect(response.requestVersion).to.equal('');
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

      it('should return component\'s name and request version for both requests', function(){
        expect(responses[0].name).to.equal('async-error2-component');
        expect(responses[0].requestVersion).to.equal('');
        expect(responses[1].name).to.equal('async-error2-component');
        expect(responses[1].requestVersion).to.equal('');
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

      it('should return component\'s name and request version', function(){
        expect(resJsonStub.args[0][1].name).to.equal('plugin-component');
        expect(resJsonStub.args[0][1].requestVersion).to.equal('');
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

        it('should return component\'s name and request version', function(){
          expect(resJsonStub.args[0][1].name).to.equal('plugin-component');
          expect(resJsonStub.args[0][1].requestVersion).to.equal('');
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

        it('should return component\'s name and request version', function(){
          expect(resJsonStub.args[0][1].name).to.equal('plugin-component');
          expect(resJsonStub.args[0][1].requestVersion).to.equal('');
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
            dependencies: [
              'underscore'
            ]
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

      it('should return component\'s name and request version', function(){
        expect(resJsonStub.args[0][1].name).to.equal('npm-component');
        expect(resJsonStub.args[0][1].requestVersion).to.equal('');
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
            local: true,
            hotReloading: true, //needed to invalidate the cache
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

      it('should return component\'s name and request version', function(){
        expect(resJsonStub.args[0][1].name).to.equal('npm-component');
        expect(resJsonStub.args[0][1].requestVersion).to.equal('');
      });
    });
  });

  describe('when getting a component with server.js that sets custom headers with empty customHeadersToSkipOnWeakVersion', function() {
    var code, response, headers;

    before(function(done) {
      initialise(mockedComponents['response-headers-component']);
      componentRoute = new ComponentRoute({}, mockedRepository);

      var resJson = function(calledCode, calledResponse) {
        code = calledCode;
        response = calledResponse;
        done();
      };

      var resSet = function(calledHeaders) {
        headers = calledHeaders;
      };

      componentRoute({
        headers: {},
        params: { componentName: 'response-headers-component', componentVersion: '1.X.X' }
      }, {
        conf: {
          baseUrl: 'http://component.com/',
          executionTimeout: 0.1
        },
        json: resJson,
        set: resSet
      });
    });

    it('should return 200 status code', function() {
      expect(code).to.be.equal(200);
    });

    it('should set response headers', function() {
      expect(response.headers).to.not.be.null;      
      expect(response.headers['test-header']).to.equal('test-value');
      expect(headers).to.not.be.null;      
      expect(headers['test-header']).to.equal('test-value');
    });

    it('should return component\'s name and request version', function() {
      expect(response.name).to.equal('response-headers-component');
      expect(response.requestVersion).to.equal('1.X.X');
    });
  });

  describe('when getting a component with server.js that sets custom headers with non-empty customHeadersToSkipOnWeakVersion', function() {
    var code, response, headers;

    before(function(done) {
      initialise(mockedComponents['response-headers-component']);
      componentRoute = new ComponentRoute({}, mockedRepository);

      var resJson = function(calledCode, calledResponse) {
        code = calledCode;
        response = calledResponse;
        done();
      };

      var resSet = function(calledHeaders) {
        headers = calledHeaders;
      };

      componentRoute({
        headers: {},
        params: { componentName: 'response-headers-component', componentVersion: '1.X.X' }
      }, {
        conf: {
          baseUrl: 'http://component.com/',
          executionTimeout: 0.1,
          customHeadersToSkipOnWeakVersion: ['test-header']
        },
        json: resJson,
        set: resSet
      });
    });

    it('should return 200 status code', function() {
      expect(code).to.be.equal(200);
    });

    it('should not set response headers', function() {
      expect(response.headers).to.be.undefined;
      expect(headers).to.be.undefined;      
    });

    it('should return component\'s name and request version', function() {
      expect(response.name).to.equal('response-headers-component');
      expect(response.requestVersion).to.equal('1.X.X');
    });
  });

  describe('when getting a simple component with server.js after headers component no custom headers should be set', function() {
    var code={}, 
      response={}, 
      headers={};

    before(function(done) {
      var headersComponent = mockedComponents['another-response-headers-component'];
      var simpleComponent = mockedComponents['simple-component'];

      mockedRepository = {
        getCompiledView: sinon.stub(),
        getComponent: sinon.stub(),
        getDataProvider: sinon.stub(),
        getStaticFilePath: sinon.stub().returns('//my-cdn.com/files/')
      };

      //Custom repository initialization to give us two components when invoked twice...
      //...the firts one with custom headers and the second - without.
      mockedRepository.getCompiledView.onCall(0).yields(null, headersComponent.view);
      mockedRepository.getCompiledView.onCall(1).yields(null, simpleComponent.view);

      mockedRepository.getComponent.onCall(0).yields(null, headersComponent.package);
      mockedRepository.getComponent.onCall(1).yields(null, simpleComponent.package);

      mockedRepository.getDataProvider.onCall(0).yields(null, headersComponent.data);
      mockedRepository.getDataProvider.onCall(1).yields(null, simpleComponent.data);

      componentRoute = new ComponentRoute({}, mockedRepository);
      resJsonStub = sinon.stub();

      var resJson = function(index, callback) { 
        return function(calledCode, calledResponse) {
          code[index] = calledCode;
          response[index] = calledResponse;
          callback && callback();
        };
      };

      var resSet = function(index) { 
        return function(calledHeaders) {
          headers[index] = calledHeaders;
        };
      };

      var requestComponent = function(componentName, resultIndex) {
        return new Promise(function(resolve, reject) {
          componentRoute({
            headers: {},
            params: { componentName: componentName, componentVersion: '1.X.X' }
          }, {
            conf: {
              baseUrl: 'http://component.com/',
              executionTimeout: 0.1
            },
            json: resJson(resultIndex, function() { resolve(); }),
            set: resSet(resultIndex)
          });
        });
      };

      requestComponent('another-response-headers-component', 0)
      .then(requestComponent('simple-component', 1))
      .then(function() { done(); });
    });

    //The first part of the test - checking that another-response-headers-component 
    //should return a response with custom headers
    it('should return 200 status code for the first component', function() {
      expect(code[0]).to.be.equal(200);
    });

    it('should return "response-headers-component" name for the first component\'s name and request version', function() {
      expect(response[0].name).to.equal('another-response-headers-component');
      expect(response[0].requestVersion).to.equal('1.X.X');
    });

    it('should set response headers for the first component', function() {
      expect(response[0].headers).to.not.be.null;      
      expect(response[0].headers['another-test-header']).to.equal('another-test-value');
      expect(headers[0]).to.not.be.null;      
      expect(headers[0]['another-test-header']).to.equal('another-test-value');
    });

    //The second part of the test - validating that simple-component should not return 
    //the custom headers previously set by another-headers-component.
    it('should return 200 status code for the first component', function() {
      expect(code[1]).to.be.equal(200);
    });

    it('should return "simple-component" name for the first component\'s name and request version', function() {
      expect(response[1].name).to.equal('simple-component');
      expect(response[1].requestVersion).to.equal('1.X.X');
    });

    it('should not set custom response', function() {
      expect(response[1].headers).to.be.undefined;      
      expect(headers[1]).to.be.undefined;      
    });
  });

  describe('when getting a component info for a component that sets custom headers', function() {
    var code, response, headers;

    before(function(done) {
      initialise(mockedComponents['response-headers-component']);
      componentRoute = new ComponentRoute({}, mockedRepository);

      var resJson = function(calledCode, calledResponse) {
        code = calledCode;
        response = calledResponse;
        done();
      };

      var resSet = function(calledHeaders) {
        headers = calledHeaders;
      };

      componentRoute({
        headers: { accept: 'application/vnd.oc.info+json' },
        params: { componentName: 'response-headers-component', componentVersion: '1.0.0' }
      }, {
        conf: {
          baseUrl: 'http://component.com/',
          executionTimeout: 0.1
        },
        json: resJson,
        set: resSet
      });
    });

    it('should return 200 status code', function() {
      expect(code).to.be.equal(200);
    });

    it('should return no custom headers', function() {
      expect(response.headers).to.be.undefined;
      expect(headers).to.be.undefined;
    });

    it('should return component\'s name and request version', function() {
      expect(response.name).to.equal('response-headers-component');
      expect(response.requestVersion).to.equal('1.0.0');
    });

    it('should not return rendered HTML', function() {
      expect(response.html).to.be.undefined;
    });
  });

});