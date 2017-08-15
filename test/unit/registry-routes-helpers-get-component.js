'use strict';

const expect = require('chai').expect;
const injectr = require('injectr');
const sinon = require('sinon');
const _ = require('lodash');

describe('registry : routes : helpers : get-component', () => {
  const mockedComponents = require('../fixtures/mocked-components');
  let fireStub, mockedRepository, GetComponent;

  const initialise = function(params) {
    fireStub = sinon.stub();
    GetComponent = injectr(
      '../../src/registry/routes/helpers/get-component.js',
      {
        '../../domain/events-handler': {
          on: _.noop,
          fire: fireStub
        }
      },
      { console, Buffer, setTimeout }
    );

    mockedRepository = {
      getCompiledView: sinon.stub().yields(null, params.view),
      getComponent: sinon.stub().yields(null, params.package),
      getDataProvider: sinon.stub().yields(null, params.data),
      getTemplates: sinon.stub(),
      getStaticFilePath: sinon.stub().returns('//my-cdn.com/files/')
    };
  };

  describe('when getting a component with success', () => {
    before(done => {
      initialise(mockedComponents['async-error2-component']);
      const getComponent = GetComponent({}, mockedRepository);

      getComponent(
        {
          name: 'async-error2-component',
          headers: {},
          parameters: {},
          version: '1.X.X',
          conf: { baseUrl: 'http://components.com/' }
        },
        () => done()
      );
    });

    it('should fire a component-retrieved event', () => {
      expect(fireStub.args[0][0]).to.equal('component-retrieved');
      expect(fireStub.args[0][1].headers).to.eql({});
      expect(fireStub.args[0][1].name).to.equal('async-error2-component');
      expect(fireStub.args[0][1].parameters).to.eql({});
      expect(fireStub.args[0][1].requestVersion).to.equal('1.X.X');
      expect(fireStub.args[0][1].href).to.equal(
        'http://components.com/async-error2-component/1.X.X'
      );
      expect(fireStub.args[0][1].version).to.equal('1.0.0');
      expect(fireStub.args[0][1].renderMode).to.equal('rendered');
      expect(fireStub.args[0][1].duration).not.to.be.empty;
      expect(fireStub.args[0][1].status).to.equal(200);
    });
  });

  describe('when getting a component with failure', () => {
    before(done => {
      initialise(mockedComponents['async-error2-component']);
      const getComponent = GetComponent({}, mockedRepository);

      getComponent(
        {
          name: 'async-error2-component',
          headers: {},
          parameters: { error: true },
          version: '1.X.X',
          conf: { baseUrl: 'http://components.com/' }
        },
        () => done()
      );
    });

    it('should fire a component-retrieved event', () => {
      expect(fireStub.args[0][0]).to.equal('component-retrieved');
      expect(fireStub.args[0][1].headers).to.eql({});
      expect(fireStub.args[0][1].name).to.equal('async-error2-component');
      expect(fireStub.args[0][1].parameters).to.eql({ error: true });
      expect(fireStub.args[0][1].requestVersion).to.equal('1.X.X');
      expect(fireStub.args[0][1].href).to.equal(
        'http://components.com/async-error2-component/1.X.X?error=true'
      );
      expect(fireStub.args[0][1].version).to.equal('1.0.0');
      expect(fireStub.args[0][1].renderMode).to.equal('rendered');
      expect(fireStub.args[0][1].duration).not.to.be.empty;
      expect(fireStub.args[0][1].status).to.equal(500);
    });
  });

  describe("when oc-client request an unrendered component and it doesn't support the correct template", () => {
    const headers = {
      'user-agent': 'oc-client-0/0-0-0',
      templates: {},
      accept: 'application/vnd.oc.unrendered+json'
    };
    let callBack;

    before(done => {
      initialise(mockedComponents['async-error2-component']);
      const getComponent = GetComponent({}, mockedRepository);
      callBack = sinon.spy(() => done());
      getComponent(
        {
          name: 'async-error2-component',
          headers,
          parameters: {},
          version: '1.X.X',
          conf: { baseUrl: 'http://components.com/' }
        },
        callBack
      );
    });

    it('should return the rendered version instead', () => {
      expect(callBack.args[0][0].response.template).to.equal(undefined);
      expect(callBack.args[0][0].response.html).to.equal('<div>hello</div>');
      expect(callBack.args[0][0].response.renderMode).to.equal('rendered');
      expect(fireStub.args[0][1].renderMode).to.equal('rendered');
    });
  });

  describe('when oc-client requests an unrendered component and it support the correct template', () => {
    const headers = {
      'user-agent': 'oc-client-0/0-0-0',
      templates: { 'oc-template-jade': true },
      accept: 'application/vnd.oc.unrendered+json'
    };
    let callBack;

    before(done => {
      initialise(mockedComponents['async-error2-component']);
      const getComponent = GetComponent({}, mockedRepository);
      callBack = sinon.spy(() => done());
      getComponent(
        {
          name: 'async-error2-component',
          headers,
          parameters: {},
          version: '1.X.X',
          conf: { baseUrl: 'http://components.com/' }
        },
        callBack
      );
    });

    it('should return the unrendered version', () => {
      expect(callBack.args[0][0].response.html).to.equal(undefined);
      expect(callBack.args[0][0].response.template).to.deep.equal({
        key: '8c1fbd954f2b0d8cd5cf11c885fed4805225749f',
        src: '//my-cdn.com/files/',
        type: 'jade'
      });
      expect(callBack.args[0][0].response.renderMode).to.equal('unrendered');
      expect(fireStub.args[0][1].renderMode).to.equal('unrendered');
    });
  });
});
