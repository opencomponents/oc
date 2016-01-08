'use strict';

var expect = require('chai').expect;
var sinon = require('sinon');

describe('registry : routes : components', function(){

  var ComponentsRoute = require('../../registry/routes/components'),
      mockedComponents = require('../fixtures/mocked-components'),
      mockedRepository, resJsonStub, componentsRoute;
  
  var initialise = function(params){
    mockedRepository = {
      getCompiledView: sinon.stub().yields(null, params.view),
      getComponent: sinon.stub().yields(null, params.package),
      getDataProvider: sinon.stub().yields(null, params.data),
      getStaticFilePath: sinon.stub().returns('//my-cdn.com/files/')
    };
  };

  describe('when making valid request for two components', function(){

    var code, response;
    before(function(done){
      initialise(mockedComponents['async-error2-component']);
      componentsRoute = new ComponentsRoute({}, mockedRepository);

      componentsRoute({
        headers: {},
        body: {
          components: [{
            name: 'async-error2-component',
            parameters: { error: true }
          }, {
            name: 'async-error2-component',
            version: '1.0.0'
          }]
        }
      }, {
        conf: { baseUrl: 'http://components.com/' },
        json: function(jsonCode, jsonResponse){
          response = jsonResponse;
          code = jsonCode;
          done();
        }
      });
    });

    it('should return 200 status code', function(){
      expect(code).to.be.equal(200);
    });

    it('should return a response containing both components', function(){
      expect(response.length).to.be.equal(2);
    });

    it('should return a response containing components in the correct order', function(){
      expect(response[0].href).to.be.undefined;
      expect(response[1].href).to.be.equal('http://components.com/async-error2-component/1.0.0');
    });

    it('should return a response with error code and description for first component', function(){
      expect(response[0].code).to.be.equal('GENERIC_ERROR');
      expect(response[0].error).to.be.equal('Component execution error: thisDoesnotExist is not defined');
    });

    it('should return a response with rendered html for second component', function(){
      expect(response[1].html).to.be.equal('<div>hello</div>');
    });
  });
});