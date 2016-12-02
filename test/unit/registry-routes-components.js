'use strict';

var expect = require('chai').expect;
var sinon = require('sinon');

describe('registry : routes : components', function(){

  var ComponentsRoute = require('../../src/registry/routes/components'),
      mockedComponents = require('../fixtures/mocked-components'),
      mockedRepository, 
      resJsonStub, 
      componentsRoute,
      code,
      response;
  
  var initialise = function(params){
    mockedRepository = {
      getCompiledView: sinon.stub().yields(null, params.view),
      getComponent: sinon.stub().yields(null, params.package),
      getDataProvider: sinon.stub().yields(null, params.data),
      getStaticFilePath: sinon.stub().returns('//my-cdn.com/files/')
    };
  };

  var makeRequest = function(body, cb){
    componentsRoute({ 
      headers: {}, 
      body: body,
      accepts: function(contentType) {
        return true;
      } 
    }, {
      conf: { baseUrl: 'http://components.com/' },
      json: function(jsonCode, jsonResponse){
        response = jsonResponse;
        code = jsonCode;
        cb();
      }
    });
  };

  var makeInfoRequest = function(body, cb){
    componentsRoute({ 
      headers: {
        accept: 'application/vnd.oc.info+json'
      }, 
      body: body,
      accepts: function(contentType) {
        return contentType ==='application/vnd.oc.info+json';
      } 
    }, {
      conf: { baseUrl: 'http://components.com/' },
      json: function(jsonCode, jsonResponse){
        response = jsonResponse;
        code = jsonCode;
        cb();
      }
    });
  };

  describe('when making valid request for two components', function(){

    before(function(done){
      initialise(mockedComponents['async-error2-component']);
      componentsRoute = new ComponentsRoute({}, mockedRepository);

      makeRequest({
        components: [{
          name: 'async-error2-component',
          version: '1.X.X',
          parameters: { error: true }
        }, {
          name: 'async-error2-component',
          version: '1.0.0'
        }]
      }, done);
    });

    it('should return 200 status code', function(){
      expect(code).to.be.equal(200);
    });

    it('should return a response containing both components', function(){
      expect(response.length).to.be.equal(2);
    });

    it('should return a response containing components in the correct order', function(){
      expect(response[0].response.href).to.be.undefined;
      expect(response[1].response.href).to.be.equal('http://components.com/async-error2-component/1.0.0');
    });

    it('should return a response with error code and description for the first component', function(){
      expect(response[0].response.code).to.be.equal('GENERIC_ERROR');
      expect(response[0].response.error).to.be.equal('Component execution error: thisDoesnotExist is not defined');
    });

    it('should return a response with rendered html for second component', function(){
      expect(response[1].response.html).to.be.equal('<div>hello</div>');
    });

    it('should include 500 status code for first component', function(){
      expect(response[0].status).to.equal(500);
    });

    it('should include 200 status code for second component', function(){
      expect(response[1].status).to.equal(200);
    });

    it('should return name and request version for both components', function(){
      expect(response[0].response.name).to.be.equal('async-error2-component');
      expect(response[0].response.requestVersion).to.be.equal('1.X.X');
      expect(response[1].response.name).to.be.equal('async-error2-component');
      expect(response[1].response.requestVersion).to.be.equal('1.0.0');
    });
  });

  describe('when making request for 0 components', function(){

    before(function(done){
      makeRequest({ components: []}, done);
    });

    it('should return 200 status code', function(){
      expect(code).to.be.equal(200);
    });

    it('should return a response containing empty array', function(){
      expect(response).to.be.eql([]);
    });
  });

  describe('when making valid info request for two components', function(){

    before(function(done){
      initialise(mockedComponents['async-error2-component']);
      componentsRoute = new ComponentsRoute({}, mockedRepository);

      makeInfoRequest({
        components: [{
          name: 'async-error2-component',
          version: '1.X.X',
          parameters: { error: true }
        }, {
          name: 'async-error2-component',
          version: '1.0.0'
        }]
      }, done);
    });

    it('should return 200 status code', function(){
      expect(code).to.be.equal(200);
    });

    it('should return a response containing both components', function(){
      expect(response.length).to.be.equal(2);
    });

    it('should return a response containing components in the correct order', function(){
      expect(response[0].response.href).to.be.undefined;
      expect(response[1].response.href).to.be.equal('http://components.com/async-error2-component/1.0.0');
    });

    it('should return a response with error code and description for the first component', function(){
      expect(response[0].response.code).to.be.equal('GENERIC_ERROR');
      expect(response[0].response.error).to.be.equal('Component execution error: thisDoesnotExist is not defined');
    });

    it('should not return a response with rendered html for the second component', function(){
      expect(response[1].response.html).to.be.undefined;
    });

    it('should include 500 status code for first component', function(){
      expect(response[0].status).to.equal(500);
    });

    it('should include 200 status code for second component', function(){
      expect(response[1].status).to.equal(200);
    });

    it('should return name and request version for both components', function(){
      expect(response[0].response.name).to.be.equal('async-error2-component');
      expect(response[0].response.requestVersion).to.be.equal('1.X.X');
      expect(response[1].response.name).to.be.equal('async-error2-component');
      expect(response[1].response.requestVersion).to.be.equal('1.0.0');
    });

    it('should rerurn the actual version for the second component', function() {
      expect(response[1].response.version).to.be.equal('1.0.0');
    });
  });

  describe('when making info request for 0 components', function(){

    before(function(done){
      makeInfoRequest({ components: []}, done);
    });

    it('should return 200 status code', function(){
      expect(code).to.be.equal(200);
    });

    it('should return a response containing empty array', function(){
      expect(response).to.be.eql([]);
    });
  });

  describe('when making not valid request', function(){

    describe('when not providing components property', function(){
      before(function(done){
        makeRequest({}, done);
      });

      it('should return 400 status code', function() {
        expect(code).to.be.equal(400);
      });

      it('should return error details', function() {
        expect(response.code).to.be.equal('POST_BODY_NOT_VALID');
        expect(response.error).to.be.equal('The request body is malformed: components property is missing');
      });
    });

    describe('when components property is not an array', function(){
      before(function(done){
        makeRequest({ components: {}}, done);
      });

      it('should return 400 status code', function() {
        expect(code).to.be.equal(400);
      });

      it('should return error details', function() {
        expect(response.code).to.be.equal('POST_BODY_NOT_VALID');
        expect(response.error).to.be.equal('The request body is malformed: components property is not an array');
      });
    });

    describe('when component does not have name property', function(){
      before(function(done){
        makeRequest({
          components: [{
            version: '1.0.0',
            namse: 'whazaa'
          }]
        }, done);
      });

      it('should return 400 status code', function() {
        expect(code).to.be.equal(400);
      });

      it('should return error details', function() {
        expect(response.code).to.be.equal('POST_BODY_NOT_VALID');
        expect(response.error).to.be.equal('The request body is malformed: component 0 must have name property');
      });
    });

    describe('when components do not have name property', function(){
      before(function(done){
        makeRequest({
          components: [{
            version: '1.0.0',
            namse: 'whazaa'
          },{
            version: '1.X.0',
            nae: 'mispelled'
          }]
        }, done);
      });

      it('should return 400 status code', function() {
        expect(code).to.be.equal(400);
      });

      it('should return error details', function() {
        expect(response.code).to.be.equal('POST_BODY_NOT_VALID');
        expect(response.error).to.be.equal('The request body is malformed: component 0 must have name property, component 1 must have name property');
      });
    });
  });
});