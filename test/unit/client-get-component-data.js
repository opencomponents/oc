'use strict';

const injectr = require('injectr');
const sinon = require('sinon');

describe('client : get-component-data', () => {

  describe('when invoked for one component', () => {
    const baseUrl = 'http://localhost:3030';
    const resultUrl = 'http://localhost:3030/hello-world/1.0.0/?p1=v1&p2=v2';

    const minimalRequestStub = sinon.stub().yields(true);
    const serverStub = sinon.stub().returns(baseUrl);
    const prepareServerGetStub = sinon.stub().returns(resultUrl);

    const options = {
      parameters: {p1: 'v1', 'p2': 'v2'},
      headers: {'header-a': 'header-value b'},
      timeout: 10
    };

    before(done => {
      const getComponentDataPrototype = injectr('../../client/src/get-components-data.js', {
        'minimal-request': minimalRequestStub,
        './href-builder': function() {
          return {
            server: serverStub,
            prepareServerGet: prepareServerGetStub
          };
        }
      });

      const getComponentData = new getComponentDataPrototype({
        registries: {serverRendering: baseUrl}
      });

      const component = {
        name: 'hello-world',
        version: '1.0.0'
      };

      getComponentData([{
        component: component,
        container: false,
        pos: 0,
        render: 'server',
        result: {}
      }], options, () => {
        done();
      });
    });

    it('href-builder prepareServerGet method is invoked', () => {
      sinon.assert.calledOnce(serverStub);
      sinon.assert.calledOnce(prepareServerGetStub);
      sinon.assert.calledWith(prepareServerGetStub, baseUrl, {name: 'hello-world', version: '1.0.0'}, options);
    });

    it('a GET request is made with the URL returned by href-builder.prepareServerGet method', () => {
      sinon.assert.calledWith(minimalRequestStub, {
        headers: options.headers,
        json: true,
        method: 'get',
        timeout: 10,
        url: resultUrl
      });
    });
  });

  describe('when invoked for two components', () => {
    const baseUrl = 'http://localhost:3030';

    const minimalRequestStub = sinon.stub().yields(true); //Returns error for every request
    const serverStub = sinon.stub().returns(baseUrl);
    const prepareServerGetStub = sinon.stub().returns(baseUrl + '/test-route'); // Invalid - should never be called

    const options = {
      parameters: {p1: 'v1', 'p2': 'v2'},
      headers: {'header-a': 'header-value b'},
      timeout: 10
    };

    const component0 = {
      name: 'hello-world',
      version: '1.0.0'
    };

    const component1 = {
      name: 'test-component',
      version: '2.0.0'
    };

    before(done => {
      const getComponentDataPrototype = injectr('../../client/src/get-components-data.js', {
        'minimal-request': minimalRequestStub,
        './href-builder': function() {
          return {
            server: serverStub,
            prepareServerGet: prepareServerGetStub
          };
        }
      });

      const getComponentData = new getComponentDataPrototype({
        registries: {serverRendering: baseUrl}
      });

      getComponentData([{
        component: component0,
        container: false,
        pos: 0,
        render: 'server',
        result: {}
      },{
        component: component1,
        container: false,
        pos: 1,
        render: 'server',
        result: {}
      }], options, () => {
        done();
      });
    });

    it('href-builder prepareServerGet method is not invoked', () => {
      sinon.assert.calledOnce(serverStub);
      sinon.assert.notCalled(prepareServerGetStub);
    });

    it('a POST request is made with the URL returned by href-builder.server method', () => {
      sinon.assert.calledWith(minimalRequestStub, {
        headers: options.headers,
        json: true,
        method: 'post',
        timeout: 10,
        url: baseUrl,
        body: {
          components: [component0, component1],
          parameters: options.parameters
        }
      });
    });
  });

});
