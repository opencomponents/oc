'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const _ = require('lodash');

describe('registry : routes : component', () => {
  const ComponentRoute = require('../../src/registry/routes/component');
  const mockedComponents = require('../fixtures/mocked-components');
  let mockedRepository, resJsonStub, resSetStub, statusStub, componentRoute;

  const templates = {
    'oc-template-jade': require('oc-template-jade'),
    'oc-template-handlebars': require('oc-template-handlebars')
  };
  const initialise = function(params) {
    resJsonStub = sinon.stub();
    resSetStub = sinon.stub();
    statusStub = sinon.stub().returns({ json: resJsonStub });
    mockedRepository = {
      getCompiledView: sinon.stub().yields(null, params.view),
      getComponent: sinon.stub().yields(null, params.package),
      getDataProvider: sinon
        .stub()
        .yields(null, { content: params.data, filePath: '/path/to/server.js' }),
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

  describe('when getting a component with server.js execution timeout', () => {
    let code, response;
    before(done => {
      initialise(mockedComponents['timeout-component']);
      componentRoute = new ComponentRoute({}, mockedRepository);

      const resStatus = function(calledCode) {
        code = calledCode;
        return {
          json: function(calledResponse) {
            response = calledResponse;
            done();
          }
        };
      };

      componentRoute(
        {
          headers: {},
          params: {
            componentName: 'timeout-component',
            componentVersion: '1.X.X'
          }
        },
        {
          conf: {
            baseUrl: 'http://component.com/',
            executionTimeout: 0.1
          },
          status: resStatus
        }
      );
    });

    it('should return 500 status code', () => {
      expect(code).to.be.equal(500);
    });

    it('should respond with error message', () => {
      expect(response.error).to.equal(
        'Component execution error: timeout (100ms)'
      );
    });

    it("should return component's name and request version", () => {
      expect(response.name).to.equal('timeout-component');
      expect(response.requestVersion).to.equal('1.X.X');
    });
  });

  describe('when getting a component with a server.js that returns undefined data', () => {
    before(() => {
      initialise(mockedComponents['undefined-component']);
      componentRoute = new ComponentRoute({}, mockedRepository);

      componentRoute(
        {
          headers: {},
          params: { componentName: 'undefined-component' }
        },
        {
          conf: {
            baseUrl: 'http://components.com/'
          },
          status: statusStub
        }
      );
    });

    it('should return 500 status code', () => {
      expect(statusStub.args[0][0]).to.be.equal(500);
    });

    it('should respond with error message for undefined data', () => {
      expect(resJsonStub.args[0][0].error).to.equal(
        'Component execution error: data object is undefined'
      );
    });

    it("should return component's name and request version", () => {
      expect(resJsonStub.args[0][0].name).to.equal('undefined-component');
      expect(resJsonStub.args[0][0].requestVersion).to.equal('');
    });
  });

  describe('when getting a component with server.js execution errors', () => {
    before(() => {
      initialise(mockedComponents['error-component']);
      componentRoute = new ComponentRoute({}, mockedRepository);

      componentRoute(
        {
          headers: {},
          params: { componentName: 'error-component' }
        },
        {
          conf: {
            baseUrl: 'http://components.com/',
            plugins: {
              a: function() {
                return '';
              }
            }
          },
          status: statusStub
        }
      );
    });

    it('should return 500 status code', () => {
      expect(statusStub.args[0][0]).to.be.equal(500);
    });

    it('should respond with error message including missing plugin', () => {
      expect(resJsonStub.args[0][0].error).to.equal(
        'Component execution error: c is not defined'
      );
    });

    it("should return component's name and request version", () => {
      expect(resJsonStub.args[0][0].name).to.equal('error-component');
      expect(resJsonStub.args[0][0].requestVersion).to.equal('');
    });
  });

  describe('when getting a component with server.js asynchronous execution errors', () => {
    describe('when has error that gets fired on first execution', () => {
      before(done => {
        initialise(mockedComponents['async-error-component']);
        componentRoute = new ComponentRoute({}, mockedRepository);
        statusStub.returns({
          json: function(response) {
            resJsonStub(response);
            done();
          }
        });

        componentRoute(
          {
            headers: {},
            params: { componentName: 'async-error-component' }
          },
          {
            conf: {
              baseUrl: 'http://components.com/',
              plugins: {}
            },
            status: statusStub
          }
        );
      });

      it('should return 500 status code', () => {
        expect(statusStub.args[0][0]).to.be.equal(500);
      });

      it('should respond with error message for component execution error', () => {
        expect(resJsonStub.args[0][0].error).to.equal(
          'Component execution error: thisDoesnotExist is not defined'
        );
      });

      it("should return component's name and request version", () => {
        expect(resJsonStub.args[0][0].name).to.equal('async-error-component');
        expect(resJsonStub.args[0][0].requestVersion).to.equal('');
      });
    });

    describe('when has error that gets fired on following executions', () => {
      before(done => {
        initialise(mockedComponents['async-error2-component']);
        componentRoute = new ComponentRoute({}, mockedRepository);
        statusStub.returns({
          json: function(response) {
            resJsonStub(response);
            if (statusStub.args.length >= 2) {
              done();
            }
          }
        });

        componentRoute(
          {
            headers: {},
            params: { componentName: 'async-error2-component' }
          },
          {
            conf: {
              baseUrl: 'http://components.com/',
              plugins: {}
            },
            status: statusStub
          }
        );

        componentRoute(
          {
            headers: {},
            params: { componentName: 'async-error2-component' },
            query: { error: true }
          },
          {
            conf: {
              baseUrl: 'http://components.com/',
              plugins: {}
            },
            status: statusStub
          }
        );
      });

      it('should return 200 status code for successful request', () => {
        expect(statusStub.args[0][0]).to.be.equal(200);
      });

      it('should return 500 status code when error happens', () => {
        expect(statusStub.args[1][0]).to.be.equal(500);
      });

      it('should respond without error for successful request', () => {
        expect(resJsonStub.args[0][0].error).to.be.empty;
      });

      it('should respond with error message for component execution error', () => {
        expect(resJsonStub.args[1][0].error).to.equal(
          'Component execution error: thisDoesnotExist is not defined'
        );
      });

      it("should return component's name and request version for both requests", () => {
        expect(resJsonStub.args[0][0].name).to.equal('async-error2-component');
        expect(resJsonStub.args[0][0].requestVersion).to.equal('');
        expect(resJsonStub.args[1][0].name).to.equal('async-error2-component');
        expect(resJsonStub.args[1][0].requestVersion).to.equal('');
      });
    });
  });

  describe('when getting a component that implements a plugin', () => {
    describe('when plugin not declared in package.json', () => {
      before(() => {
        initialise(mockedComponents['plugin-component']);
        componentRoute = new ComponentRoute({}, mockedRepository);

        componentRoute(
          {
            headers: {},
            params: { componentName: 'plugin-component' }
          },
          {
            conf: {
              baseUrl: 'http://components.com/',
              plugins: {}
            },
            status: statusStub
          }
        );
      });

      it('should return 500 status code', () => {
        expect(statusStub.args[0][0]).to.be.equal(500);
      });

      it('should respond with GENERIC_ERROR error code', () => {
        expect(resJsonStub.args[0][0].code).to.equal('GENERIC_ERROR');
      });

      it('should respond with error message including missing plugin', () => {
        expect(resJsonStub.args[0][0].error).to.contain(
          'plugins.doSomething is not a function'
        );
      });

      it("should return component's name and request version", () => {
        expect(resJsonStub.args[0][0].name).to.equal('plugin-component');
        expect(resJsonStub.args[0][0].requestVersion).to.equal('');
      });
    });

    describe('when plugin declared in package.json', () => {
      beforeEach(() => {
        const component = _.clone(mockedComponents['plugin-component']);
        component.package.oc.plugins = ['doSomething'];
        initialise(component);
        componentRoute = new ComponentRoute({}, mockedRepository);
      });

      describe('when registry implements plugin', () => {
        beforeEach(() => {
          componentRoute(
            {
              headers: {},
              params: { componentName: 'plugin-component' }
            },
            {
              conf: {
                baseUrl: 'http://components.com/',
                plugins: {
                  doSomething: function() {
                    return 'hello hello hello my friend';
                  }
                }
              },
              status: statusStub
            }
          );
        });

        it('should return 200 status code', () => {
          expect(statusStub.args[0][0]).to.be.equal(200);
        });

        it('should use plugin inside compiledView', () => {
          expect(resJsonStub.args[0][0].html).to.contain(
            'hello hello hello my friend John'
          );
        });

        it("should return component's name and request version", () => {
          expect(resJsonStub.args[0][0].name).to.equal('plugin-component');
          expect(resJsonStub.args[0][0].requestVersion).to.equal('');
        });
      });

      describe('when registry does not implement plugin', () => {
        beforeEach(() => {
          componentRoute(
            {
              headers: {},
              params: { componentName: 'plugin-component' }
            },
            {
              conf: { baseUrl: 'http://components.com/' },
              status: statusStub
            }
          );
        });

        it('should return 501 status code', () => {
          expect(statusStub.args[0][0]).to.be.equal(501);
        });

        it('should respond with PLUGIN_MISSING_FROM_REGISTRY error code', () => {
          expect(resJsonStub.args[0][0].code).to.equal(
            'PLUGIN_MISSING_FROM_REGISTRY'
          );
        });

        it('should respond with error message including missing plugin', () => {
          expect(resJsonStub.args[0][0].error).to.equal(
            'registry does not implement plugins: doSomething'
          );
        });

        it("should return component's name and request version", () => {
          expect(resJsonStub.args[0][0].name).to.equal('plugin-component');
          expect(resJsonStub.args[0][0].requestVersion).to.equal('');
        });
      });
    });
  });

  describe('when getting a component that requires a npm module', () => {
    describe('when registry implements dependency', () => {
      beforeEach(() => {
        initialise(mockedComponents['npm-component']);
        componentRoute = new ComponentRoute({}, mockedRepository);

        componentRoute(
          {
            headers: {},
            params: { componentName: 'npm-component' }
          },
          {
            conf: {
              local: true, //needed to invalidate the cache
              baseUrl: 'http://components.com/',
              plugins: {},
              dependencies: ['lodash']
            },
            status: statusStub
          }
        );
      });

      it('should return 200 status code', () => {
        expect(statusStub.args[0][0]).to.be.equal(200);
      });

      it('should use plugin inside compiledView', () => {
        expect(resJsonStub.args[0][0].html).to.contain('bye John');
      });

      it("should return component's name and request version", () => {
        expect(resJsonStub.args[0][0].name).to.equal('npm-component');
        expect(resJsonStub.args[0][0].requestVersion).to.equal('');
      });
    });

    describe('when registry does not implement dependency', () => {
      beforeEach(() => {
        initialise(mockedComponents['npm-component']);
        componentRoute = new ComponentRoute({}, mockedRepository);

        componentRoute(
          {
            headers: {},
            params: { componentName: 'npm-component' }
          },
          {
            conf: {
              local: true,
              hotReloading: true, //needed to invalidate the cache
              baseUrl: 'http://components.com/',
              plugins: {},
              dependencies: {}
            },
            status: statusStub
          }
        );
      });

      it('should return 501 status code', () => {
        expect(statusStub.args[0][0]).to.be.equal(501);
      });

      it('should respond with DEPENDENCY_MISSING_FROM_REGISTRY error code', () => {
        expect(resJsonStub.args[0][0].code).to.equal(
          'DEPENDENCY_MISSING_FROM_REGISTRY'
        );
      });

      it('should respond with error message including missing dependency', () => {
        expect(resJsonStub.args[0][0].error).to.equal(
          'Component is trying to use unavailable dependencies: lodash'
        );
      });

      it("should return component's name and request version", () => {
        expect(resJsonStub.args[0][0].name).to.equal('npm-component');
        expect(resJsonStub.args[0][0].requestVersion).to.equal('');
      });
    });
  });

  describe('when getting a component with server.js that sets custom headers with empty customHeadersToSkipOnWeakVersion', () => {
    before(() => {
      initialise(mockedComponents['response-headers-component']);
      componentRoute = new ComponentRoute({}, mockedRepository);

      componentRoute(
        {
          headers: {},
          params: {
            componentName: 'response-headers-component',
            componentVersion: '1.X.X'
          }
        },
        {
          conf: {
            baseUrl: 'http://component.com/',
            executionTimeout: 0.1
          },
          status: statusStub,
          set: resSetStub
        }
      );
    });

    it('should return 200 status code', () => {
      expect(statusStub.args[0][0]).to.be.equal(200);
    });

    it('should set response headers', () => {
      expect(resJsonStub.args[0][0].headers).to.be.undefined;
      expect(resSetStub.args[0][0]).to.not.be.null;
      expect(resSetStub.args[0][0]['test-header']).to.equal('test-value');
    });

    it("should return component's name and request version", () => {
      expect(resJsonStub.args[0][0].name).to.equal(
        'response-headers-component'
      );
      expect(resJsonStub.args[0][0].requestVersion).to.equal('1.X.X');
    });
  });

  describe('when getting a component with server.js that sets custom headers with non-empty customHeadersToSkipOnWeakVersion', () => {
    before(done => {
      initialise(mockedComponents['response-headers-component']);
      componentRoute = new ComponentRoute({}, mockedRepository);

      statusStub.returns({
        json: function(response) {
          resJsonStub(response);
          done();
        }
      });

      componentRoute(
        {
          headers: {},
          params: {
            componentName: 'response-headers-component',
            componentVersion: '1.X.X'
          }
        },
        {
          conf: {
            baseUrl: 'http://component.com/',
            executionTimeout: 0.1,
            customHeadersToSkipOnWeakVersion: ['test-header']
          },
          status: statusStub,
          set: resSetStub
        }
      );
    });

    it('should return 200 status code', () => {
      expect(statusStub.args[0][0]).to.be.equal(200);
    });

    it('should not set response headers', () => {
      expect(resJsonStub.args[0][0].headers).to.be.undefined;
      expect(resSetStub.called).to.be.false;
    });

    it("should return component's name and request version", () => {
      expect(resJsonStub.args[0][0].name).to.equal(
        'response-headers-component'
      );
      expect(resJsonStub.args[0][0].requestVersion).to.equal('1.X.X');
    });
  });

  describe('when getting a simple component with server.js after headers component no custom headers should be set', () => {
    before(done => {
      const headersComponent =
        mockedComponents['another-response-headers-component'];
      const simpleComponent = mockedComponents['simple-component'];
      const templates = {
        'oc-template-jade': require('oc-template-jade'),
        'oc-template-handlebars': require('oc-template-handlebars')
      };

      mockedRepository = {
        getCompiledView: sinon.stub(),
        getComponent: sinon.stub(),
        getDataProvider: sinon.stub(),
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

      // Custom repository initialization to give us two components when invoked twice.
      // The firts one with custom headers and the second without.

      mockedRepository.getCompiledView
        .onCall(0)
        .yields(null, headersComponent.view);
      mockedRepository.getCompiledView
        .onCall(1)
        .yields(null, simpleComponent.view);

      mockedRepository.getComponent
        .onCall(0)
        .yields(null, headersComponent.package);
      mockedRepository.getComponent
        .onCall(1)
        .yields(null, simpleComponent.package);

      mockedRepository.getDataProvider.onCall(0).yields(null, {
        content: headersComponent.data,
        filePath: '/path/to/server.js'
      });
      mockedRepository.getDataProvider.onCall(1).yields(null, {
        content: simpleComponent.data,
        filePath: '/path/to/another-server.js'
      });

      componentRoute = new ComponentRoute({}, mockedRepository);

      resJsonStub = sinon.stub();
      resSetStub = sinon.stub();

      statusStub = sinon.stub().returns({
        json: function(response) {
          resJsonStub(response);
          if (statusStub.args.length >= 2) {
            done();
          }
        }
      });

      componentRoute(
        {
          headers: {},
          params: {
            componentName: 'another-response-headers-component',
            componentVersion: '1.X.X'
          }
        },
        {
          conf: {
            baseUrl: 'http://component.com/',
            executionTimeout: 0.1
          },
          status: statusStub,
          set: resSetStub
        }
      );

      componentRoute(
        {
          headers: {},
          params: {
            componentName: 'simple-component',
            componentVersion: '1.X.X'
          }
        },
        {
          conf: {
            baseUrl: 'http://component.com/',
            executionTimeout: 0.1
          },
          status: statusStub,
          set: resSetStub
        }
      );
    });

    it('should return 200 status code for the first component', () => {
      expect(statusStub.args[0][0]).to.be.equal(200);
    });

    it('should return "response-headers-component" name for the first component\'s name and request version', () => {
      expect(resJsonStub.args[0][0].name).to.equal(
        'another-response-headers-component'
      );
      expect(resJsonStub.args[0][0].requestVersion).to.equal('1.X.X');
    });

    it('should set response headers for the first component', () => {
      expect(resJsonStub.args[0][0].headers).to.be.undefined;
      expect(resSetStub.args[0][0]).to.not.be.null;
      expect(resSetStub.args[0][0]['another-test-header']).to.equal(
        'another-test-value'
      );
    });

    it('should return 200 status code for the second component', () => {
      expect(statusStub.args[1][0]).to.be.equal(200);
    });

    it('should return "simple-component" name for the second component\'s name and request version', () => {
      expect(resJsonStub.args[1][0].name).to.equal('simple-component');
      expect(resJsonStub.args[1][0].requestVersion).to.equal('1.X.X');
    });

    it('should not set custom response for the second component', () => {
      expect(resJsonStub.args[1][0].headers).to.be.undefined;
      expect(resSetStub.calledTwice).to.be.false;
    });
  });

  describe('when getting a component info for a component that sets custom headers', () => {
    before(() => {
      initialise(mockedComponents['response-headers-component']);
      componentRoute = new ComponentRoute({}, mockedRepository);

      componentRoute(
        {
          headers: { accept: 'application/vnd.oc.info+json' },
          params: {
            componentName: 'response-headers-component',
            componentVersion: '1.0.0'
          }
        },
        {
          conf: {
            baseUrl: 'http://component.com/',
            executionTimeout: 0.1
          },
          status: statusStub,
          set: resSetStub
        }
      );
    });

    it('should return 200 status code', () => {
      expect(statusStub.args[0][0]).to.be.equal(200);
    });

    it('should return no custom headers', () => {
      expect(resJsonStub.args[0][0].headers).to.be.undefined;
      expect(resSetStub.called).to.be.false;
    });

    it("should return component's name and request version", () => {
      expect(resJsonStub.args[0][0].name).to.equal(
        'response-headers-component'
      );
      expect(resJsonStub.args[0][0].requestVersion).to.equal('1.0.0');
    });

    it('should not return rendered HTML', () => {
      expect(resJsonStub.args[0][0].html).to.be.undefined;
    });
  });
});
