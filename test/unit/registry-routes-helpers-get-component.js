'use strict';

var expect = require('chai').expect;
var injectr = require('injectr');
var sinon = require('sinon');
var _ = require('underscore');

describe('registry : routes : helpers : get-component', function(){

  var fireStub = sinon.stub(),
      mockedComponents = require('../fixtures/mocked-components'),
      mockedRepository,
      getComponent,
      GetComponent = injectr('../../src/registry/routes/helpers/get-component.js', {
        '../../domain/events-handler': {
          on: _.noop,
          fire: fireStub
        }
      }, { console: console, Buffer: Buffer, setTimeout: setTimeout });
  
  var initialise = function(params){
    mockedRepository = {
      getCompiledView: sinon.stub().yields(null, params.view),
      getComponent: sinon.stub().yields(null, params.package),
      getDataProvider: sinon.stub().yields(null, params.data),
      getStaticFilePath: sinon.stub().returns('//my-cdn.com/files/')
    };
  };

  describe('when getting a component', function(){

    before(function(done){
      initialise(mockedComponents['async-error2-component']);
      getComponent = new GetComponent({}, mockedRepository);

     getComponent({
        name: 'async-error2-component',
        headers: {},
        parameters: {},
        version: '1.X.X',
        conf: { baseUrl: 'http://components.com/' }
      }, function(response){
        done();
      });
    });

    it('should fire a component-retrieved event', function(){
      expect(fireStub.args[0][0]).to.equal('component-retrieved');
      expect(fireStub.args[0][1].headers).to.eql({});
      expect(fireStub.args[0][1].name).to.equal('async-error2-component');
      expect(fireStub.args[0][1].parameters).to.eql({});
      expect(fireStub.args[0][1].requestVersion).to.equal('1.X.X');
      expect(fireStub.args[0][1].href).to.equal('http://components.com/async-error2-component/1.X.X');
      expect(fireStub.args[0][1].version).to.equal('1.0.0');
      expect(fireStub.args[0][1].renderMode).to.equal('rendered');
      expect(fireStub.args[0][1].duration).not.to.be.empty;
    });
  });
});