const expect = require('chai').expect;
const injectr = require('injectr');
const sinon = require('sinon');

describe('registry : routes : helpers : get-component-fallback', () => {
  it('should not forward accept-encoding header when fetching from fallback registry', (done) => {
    const requestStub = sinon.stub().resolves({
      statusCode: 200,
      body: {
        json: sinon.stub().resolves([
          {
            status: 200,
            response: { name: 'my-component' }
          }
        ])
      }
    });

    const getComponentFallback = injectr(
      '../../dist/registry/routes/helpers/get-component-fallback.js',
      {
        undici: {
          request: requestStub
        }
      },
      { URL }
    );

    getComponentFallback.getComponent(
      'http://localhost:4000/',
      {
        'accept-encoding': 'gzip, deflate, br',
        'content-type': 'application/json',
        'x-custom-header': 'test-value'
      },
      { name: 'my-component', version: '1.0.0', parameters: {} },
      (result) => {
        expect(result).to.eql({
          status: 200,
          response: { name: 'my-component' }
        });

        const requestHeaders = requestStub.getCall(0).args[1].headers;

        expect(requestHeaders['accept-encoding']).to.equal(undefined);
        expect(requestHeaders['content-type']).to.equal(undefined);
        expect(requestHeaders['Content-Type']).to.equal('application/json');
        expect(requestHeaders['x-custom-header']).to.equal('test-value');

        done();
      }
    );
  });
});
