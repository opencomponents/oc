'use strict';

const expect = require('chai').expect;
const injectr = require('injectr');
const sinon = require('sinon');
const _ = require('lodash');

describe('registry : routes : helpers : get-component', () => {
  const fireStub = sinon.stub(),
    mockedComponents = require('../fixtures/mocked-components'),
    GetComponent = injectr('../../src/registry/routes/helpers/get-component.js', {
      '../../domain/events-handler': {
        on: _.noop,
        fire: fireStub
      }
    }, { console: console, Buffer: Buffer, setTimeout: setTimeout });

  let mockedRepository,
    getComponent;

  const initialise = function(params){
    mockedRepository = {
      getCompiledView: sinon.stub().yields(null, params.view),
      getComponent: sinon.stub().yields(null, params.package),
      getDataProvider: sinon.stub().yields(null, params.data),
      getTemplates: sinon.stub(),
      getStaticFilePath: sinon.stub().returns('//my-cdn.com/files/')
    };
  };

  describe('when getting a component', () => {

    before((done) => {
      initialise(mockedComponents['async-error2-component']);
      getComponent = new GetComponent({}, mockedRepository);

      getComponent({
        name: 'async-error2-component',
        headers: {},
        parameters: {},
        version: '1.X.X',
        conf: { baseUrl: 'http://components.com/' }
      }, () => {
        done();
      });
    });

    it('should fire a component-retrieved event', () => {
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