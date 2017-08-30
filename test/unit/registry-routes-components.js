'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');

describe('registry : routes : components', () => {
  const ComponentsRoute = require('../../src/registry/routes/components'),
    mockedComponents = require('../fixtures/mocked-components');

  let mockedRepository, componentsRoute, code, response;
  const templates = {
    'oc-template-jade': require('oc-template-jade'),
    'oc-template-handlebars': require('oc-template-handlebars')
  };

  const initialise = function(params) {
    mockedRepository = {
      getCompiledView: sinon.stub().yields(null, params.view),
      getComponent: sinon.stub().yields(null, params.package),
      getDataProvider: sinon.stub().yields(null, params.data),
      getTemplatesInfo: sinon.stub().returns([
        {
          type: 'oc-template-jade',
          version: '6.0.1',
          externals: []
        },
        {
          type: 'oc-template-handlebars',
          version: '6.0.2',
          externals: []
        }
      ]),
      getTemplate: type => templates[type],
      getStaticFilePath: sinon.stub().returns('//my-cdn.com/files/')
    };
  };

  const makeRequest = function(body, cb) {
    componentsRoute(
      { headers: {}, body: body },
      {
        conf: { baseUrl: 'http://components.com/' },
        status: function(jsonCode) {
          code = jsonCode;
          return {
            json: function(jsonResponse) {
              response = jsonResponse;
              cb();
            }
          };
        }
      }
    );
  };

  const makeInfoRequest = function(body, cb) {
    componentsRoute(
      { headers: { accept: 'application/vnd.oc.info+json' }, body: body },
      {
        conf: { baseUrl: 'http://components.com/' },
        status: function(jsonCode) {
          code = jsonCode;
          return {
            json: function(jsonResponse) {
              response = jsonResponse;
              cb();
            }
          };
        }
      }
    );
  };

  describe('when making valid request for two components', () => {
    before(done => {
      initialise(mockedComponents['async-error2-component']);
      componentsRoute = new ComponentsRoute({}, mockedRepository);

      makeRequest(
        {
          components: [
            {
              name: 'async-error2-component',
              version: '1.X.X',
              parameters: { error: true }
            },
            {
              name: 'async-error2-component',
              version: '1.0.0'
            }
          ]
        },
        done
      );
    });

    it('should return 200 status code', () => {
      expect(code).to.be.equal(200);
    });

    it('should return a response containing both components', () => {
      expect(response.length).to.be.equal(2);
    });

    it('should return a response containing components in the correct order', () => {
      expect(response[0].response.href).to.be.undefined;
      expect(response[1].response.href).to.be.equal(
        'http://components.com/async-error2-component/1.0.0'
      );
    });

    it('should return a response with error code and description for the first component', () => {
      expect(response[0].response.code).to.be.equal('GENERIC_ERROR');
      expect(response[0].response.error).to.be.equal(
        'Component execution error: thisDoesnotExist is not defined'
      );
    });

    it('should return a response with rendered html for second component', () => {
      expect(response[1].response.html).to.be.equal('<div>hello</div>');
    });

    it('should include 500 status code for first component', () => {
      expect(response[0].status).to.equal(500);
    });

    it('should include 200 status code for second component', () => {
      expect(response[1].status).to.equal(200);
    });

    it('should return name and request version for both components', () => {
      expect(response[0].response.name).to.be.equal('async-error2-component');
      expect(response[0].response.requestVersion).to.be.equal('1.X.X');
      expect(response[1].response.name).to.be.equal('async-error2-component');
      expect(response[1].response.requestVersion).to.be.equal('1.0.0');
    });
  });

  describe('when making request for 0 components', () => {
    before(done => {
      makeRequest({ components: [] }, done);
    });

    it('should return 200 status code', () => {
      expect(code).to.be.equal(200);
    });

    it('should return a response containing empty array', () => {
      expect(response).to.be.eql([]);
    });
  });

  describe('when making valid info request for two components', () => {
    before(done => {
      initialise(mockedComponents['async-error2-component']);
      componentsRoute = new ComponentsRoute({}, mockedRepository);

      makeInfoRequest(
        {
          components: [
            {
              name: 'async-error2-component',
              version: '1.X.X'
            },
            {
              name: 'async-error2-component',
              version: '1.0.0'
            }
          ]
        },
        done
      );
    });

    it('should return 200 status code', () => {
      expect(code).to.be.equal(200);
    });

    it('should return a response containing both components', () => {
      expect(response.length).to.be.equal(2);
    });

    const expectedResponse = [
      {
        status: 200,
        response: {
          name: 'async-error2-component',
          type: 'oc-component',
          requestVersion: '1.X.X',
          version: '1.0.0'
        }
      },
      {
        status: 200,
        response: {
          name: 'async-error2-component',
          type: 'oc-component',
          requestVersion: '1.0.0',
          version: '1.0.0'
        }
      }
    ];

    it('should return a response containing components in the correct order', () => {
      expect(response).to.be.eql(expectedResponse);
    });
  });

  describe('when making info request for 0 components', () => {
    before(done => {
      makeInfoRequest({ components: [] }, done);
    });

    it('should return 200 status code', () => {
      expect(code).to.be.equal(200);
    });

    it('should return a response containing empty array', () => {
      expect(response).to.be.eql([]);
    });
  });

  describe('when making not valid request', () => {
    describe('when not providing components property', () => {
      before(done => {
        makeRequest({}, done);
      });

      it('should return 400 status code', () => {
        expect(code).to.be.equal(400);
      });

      it('should return error details', () => {
        expect(response.code).to.be.equal('POST_BODY_NOT_VALID');
        expect(response.error).to.be.equal(
          'The request body is malformed: components property is missing'
        );
      });
    });

    describe('when components property is not an array', () => {
      before(done => {
        makeRequest({ components: {} }, done);
      });

      it('should return 400 status code', () => {
        expect(code).to.be.equal(400);
      });

      it('should return error details', () => {
        expect(response.code).to.be.equal('POST_BODY_NOT_VALID');
        expect(response.error).to.be.equal(
          'The request body is malformed: components property is not an array'
        );
      });
    });

    describe('when component does not have name property', () => {
      before(done => {
        makeRequest(
          {
            components: [
              {
                version: '1.0.0',
                namse: 'whazaa'
              }
            ]
          },
          done
        );
      });

      it('should return 400 status code', () => {
        expect(code).to.be.equal(400);
      });

      it('should return error details', () => {
        expect(response.code).to.be.equal('POST_BODY_NOT_VALID');
        expect(response.error).to.be.equal(
          'The request body is malformed: component 0 must have name property'
        );
      });
    });

    describe('when components do not have name property', () => {
      before(done => {
        makeRequest(
          {
            components: [
              {
                version: '1.0.0',
                namse: 'whazaa'
              },
              {
                version: '1.X.0',
                nae: 'mispelled'
              }
            ]
          },
          done
        );
      });

      it('should return 400 status code', () => {
        expect(code).to.be.equal(400);
      });

      it('should return error details', () => {
        expect(response.code).to.be.equal('POST_BODY_NOT_VALID');
        expect(response.error).to.be.equal(
          'The request body is malformed: component 0 must have name property, component 1 must have name property'
        );
      });
    });
  });
});
