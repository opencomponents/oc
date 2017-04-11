'use strict';

const expect = require('chai').expect;
const injectr = require('injectr');
const sinon = require('sinon');

describe('client : warmup', () => {

  let Warmup, requestStub;

  const initialise = function(error, mockedResponse){

    requestStub = sinon.stub().yields(error, mockedResponse || {
      name: 'componentName',
      version: '1.2.43',
      oc: { parameters: {} }
    });

    Warmup = injectr('../../client/src/warmup.js', {
      'minimal-request': requestStub
    }, { console: console });
  };

  describe('when warming up the client for responsive components', () => {

    let error, renderComponentStub;

    beforeEach((done) => {
      initialise();

      renderComponentStub = sinon.stub().yields(null, ['hello', 'component', 'another']);

      const warmup = new Warmup({
        components: {
          'component1': '',
          'component2': '1.x.x'
        },
        registries: {
          serverRendering: 'https://my-registry.com'
        }
      }, renderComponentStub);

      warmup({}, (err) => {
        error = err;
        done();
      });
    });

    it('should return no error', () => {
      expect(error).to.be.null;
    });

    it('should make individual requests to ~info routes for each component + oc-client component', () => {
      expect(requestStub.args.length).to.equal(3);
      expect(requestStub.args[0][0].url).to.equal('https://my-registry.com/component1/~info');
      expect(requestStub.args[1][0].url).to.equal('https://my-registry.com/component2/1.x.x/~info');
      expect(requestStub.args[2][0].url).to.equal('https://my-registry.com/oc-client/~info');
    });

    it('should render the components', () => {
      expect(renderComponentStub.args[0][0].length).to.equal(3);
    });
  });

  describe('when warming up the client for component with parameters', () => {
    let error, renderComponentStub;

    beforeEach((done) => {
      initialise(null, {
        name: 'component-with-params',
        version: '1.4.6',
        oc: {
          parameters: {
            name: {
              mandatory: true,
              type: 'string',
              example: 'John Doe',
              description: 'Name'
            }
          }
        }
      });

      renderComponentStub = sinon.stub().yields(null, ['hello']);

      const warmup = new Warmup({
        components: {
          'component-with-params': ''
        },
        registries: {
          serverRendering: 'https://my-registry.com'
        }
      }, renderComponentStub);

      warmup({}, (err) => {
        error = err;
        done();
      });
    });

    it('should return no error', () => {
      expect(error).to.be.null;
    });

    it('should render the component with the mandatory parameters', () => {
      expect(renderComponentStub.args[0][0][0]).to.eql({
        name: 'component-with-params',
        version: '1.4.6',
        parameters: {
          name: 'John Doe'
        }
      });
    });
  });

  describe('when warming up the client for unresponsive components', () => {

    let error;

    beforeEach((done) => {
      initialise('timeout');

      const warmup = new Warmup({
        components: { component1: '' },
        registries: {
          serverRendering: 'https://my-registry.com'
        }
      }, () => {});

      warmup({
        headers: {
          'Accept-Language': 'en-US'
        }
      }, (err) => {
        error = err;
        done();
      });
    });

    it('should return an error with all the details', () => {

      const expectedRequest = {
        url: 'https://my-registry.com/component1/~info',
        json: true,
        headers: { 'Accept-Language': 'en-US' },
        method: 'GET',
        timeout: 5
      };

      const expectedError = 'Error: Error warming up oc-client: request ' + JSON.stringify(expectedRequest) + ' failed (timeout)';

      expect(error.toString()).to.be.equal(expectedError);
    });
  });
});
