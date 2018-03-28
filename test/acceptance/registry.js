'use strict';

const expect = require('chai').expect;
const emptyResponseHandler = require('oc-empty-response-handler');
const path = require('path');
const request = require('minimal-request');
const _ = require('lodash');

describe('registry', () => {
  let registry, result, error, headers, status;

  const oc = require('../../src/index');

  const next = function(done) {
    return function(e, r, d) {
      error = e;
      result = r;
      headers = d.response.headers;
      status = d.response.statusCode;
      done();
    };
  };

  const getDefaultTestConfiguration = function() {
    return {
      local: true,
      path: path.resolve('test/fixtures/components'),
      port: 3030,
      baseUrl: 'http://localhost:3030/',
      env: { name: 'local' },
      verbosity: 0,
      dependencies: ['lodash']
    };
  };

  const initializeRegistry = function(configuration, cb) {
    registry = new oc.Registry(configuration);
    registry.start(cb);
  };

  before(done => {
    initializeRegistry(getDefaultTestConfiguration(), done);
  });

  after(done => {
    registry.close(done);
  });

  describe('when initialised with invalid configuration', () => {
    it('should throw an error', done => {
      expect(() => {
        oc.Registry({});
      }).to.throw('Registry configuration is empty');

      done();
    });
  });

  describe('GET /hello-world-custom-headers', () => {
    describe('with the default configuration (no customHeadersToSkipOnWeakVersion defined) and strong version 1.0.0', () => {
      before(done => {
        request(
          {
            url: 'http://localhost:3030/hello-world-custom-headers/1.0.0',
            json: true
          },
          next(done)
        );
      });

      it('should return the component with custom headers', () => {
        expect(result.version).to.equal('1.0.0');
        expect(result.name).to.equal('hello-world-custom-headers');
        expect(result.headers).to.be.undefined;
        expect(headers).to.have.property(
          'cache-control',
          'public max-age=3600'
        );
        expect(headers).to.have.property('test-header', 'Test-Value');
      });
    });

    describe('with the default configuration (no customHeadersToSkipOnWeakVersion defined) and weak version 1.x.x', () => {
      before(done => {
        request(
          {
            url: 'http://localhost:3030/hello-world-custom-headers/1.x.x',
            json: true
          },
          next(done)
        );
      });

      it('should return the component with custom headers', () => {
        expect(result.version).to.equal('1.0.0');
        expect(result.name).to.equal('hello-world-custom-headers');
        expect(result.headers).to.be.undefined;
        expect(headers).to.have.property(
          'cache-control',
          'public max-age=3600'
        );
        expect(headers).to.have.property('test-header', 'Test-Value');
      });
    });

    describe('with a custom configuration with customHeadersToSkipOnWeakVersion defined', () => {
      before(done => {
        registry.close();
        initializeRegistry(
          _.extend(getDefaultTestConfiguration(), {
            customHeadersToSkipOnWeakVersion: ['Cache-Control']
          }),
          done
        );
      });

      after(done => {
        registry.close(() => {
          initializeRegistry(getDefaultTestConfiguration(), done);
        });
      });

      describe('when strong version is requested 1.0.0', () => {
        before(done => {
          request(
            {
              url: 'http://localhost:3030/hello-world-custom-headers/1.0.0',
              json: true
            },
            next(done)
          );
        });

        it('should return the component with the custom headers', () => {
          expect(result.version).to.equal('1.0.0');
          expect(result.name).to.equal('hello-world-custom-headers');
          expect(result.headers).to.be.undefined;
          expect(headers).to.have.property(
            'cache-control',
            'public max-age=3600'
          );
          expect(headers).to.have.property('test-header', 'Test-Value');
        });
      });

      describe('when weak version is requested 1.x.x', () => {
        before(done => {
          request(
            {
              url: 'http://localhost:3030/hello-world-custom-headers/1.x.x',
              json: true
            },
            next(done)
          );
        });

        it('should skip Cache-Control header', () => {
          expect(result.version).to.equal('1.0.0');
          expect(result.name).to.equal('hello-world-custom-headers');
          expect(result.headers).to.be.undefined;
          expect(headers).to.not.have.property('cache-control');
          expect(headers).to.have.property('test-header', 'Test-Value');
        });
      });
    });
  });

  describe('POST /hello-world-custom-headers', () => {
    describe('with the default configuration (no customHeadersToSkipOnWeakVersion defined) and strong version 1.0.0', () => {
      before(done => {
        request(
          {
            url: 'http://localhost:3030',
            json: true,
            method: 'post',
            body: {
              components: [
                {
                  name: 'hello-world-custom-headers',
                  version: '1.0.0'
                }
              ]
            }
          },
          next(done)
        );
      });

      it('should not set HTTP custom headers', () => {
        expect(headers).to.not.have.property('cache-control');
        expect(headers).to.not.have.property('test-header');
      });

      it('should return the component with custom headers', () => {
        expect(result[0].response.version).to.equal('1.0.0');
        expect(result[0].response.name).to.equal('hello-world-custom-headers');
        expect(result[0].headers).to.be.deep.equal({
          'cache-control': 'public max-age=3600',
          'test-header': 'Test-Value'
        });
      });
    });

    describe('with the default configuration (no customHeadersToSkipOnWeakVersion defined) and weak version 1.x.x', () => {
      before(done => {
        request(
          {
            url: 'http://localhost:3030',
            json: true,
            method: 'post',
            body: {
              components: [
                {
                  name: 'hello-world-custom-headers',
                  version: '1.x.x'
                }
              ]
            }
          },
          next(done)
        );
      });

      it('should not set HTTP custom headers', () => {
        expect(headers).to.not.have.property('cache-control');
        expect(headers).to.not.have.property('test-header');
      });

      it('should return the component with custom headers in the response body', () => {
        expect(result[0].response.version).to.equal('1.0.0');
        expect(result[0].response.name).to.equal('hello-world-custom-headers');
        expect(result[0].headers).to.be.deep.equal({
          'cache-control': 'public max-age=3600',
          'test-header': 'Test-Value'
        });
      });
    });

    describe('with a custom configuration with customHeadersToSkipOnWeakVersion defined', () => {
      before(done => {
        registry.close();
        initializeRegistry(
          _.extend(getDefaultTestConfiguration(), {
            customHeadersToSkipOnWeakVersion: ['Cache-Control']
          }),
          done
        );
      });

      after(done => {
        registry.close(() => {
          initializeRegistry(getDefaultTestConfiguration(), done);
        });
      });

      describe('when strong version is requested 1.0.0', () => {
        before(done => {
          request(
            {
              url: 'http://localhost:3030',
              json: true,
              method: 'post',
              body: {
                components: [
                  {
                    name: 'hello-world-custom-headers',
                    version: '1.0.0'
                  }
                ]
              }
            },
            next(done)
          );
        });

        it('should not set HTTP custom headers', () => {
          expect(headers).to.not.have.property('cache-control');
          expect(headers).to.not.have.property('test-header');
        });

        it('should return the component with the custom headers', () => {
          expect(result[0].response.version).to.equal('1.0.0');
          expect(result[0].response.name).to.equal(
            'hello-world-custom-headers'
          );
          expect(result[0].headers).to.be.deep.equal({
            'cache-control': 'public max-age=3600',
            'test-header': 'Test-Value'
          });
        });
      });

      describe('when weak version is requested 1.x.x', () => {
        before(done => {
          request(
            {
              url: 'http://localhost:3030',
              json: true,
              method: 'post',
              body: {
                components: [
                  {
                    name: 'hello-world-custom-headers',
                    version: '1.x.x'
                  }
                ]
              }
            },
            next(done)
          );
        });

        it('should not set HTTP custom headers', () => {
          expect(headers).to.not.have.property('cache-control');
          expect(headers).to.not.have.property('test-header');
        });

        it('should skip Cache-Control header', () => {
          expect(result[0].response.version).to.equal('1.0.0');
          expect(result[0].response.name).to.equal(
            'hello-world-custom-headers'
          );
          expect(result[0].headers).to.be.deep.equal({
            'test-header': 'Test-Value'
          });
        });
      });
    });
  });

  describe('GET /', () => {
    before(done => {
      request(
        {
          url: 'http://localhost:3030',
          json: true
        },
        next(done)
      );
    });

    it('should respond with the correct href', () => {
      expect(result.href).to.equal('http://localhost:3030/');
    });

    it('should list the components', () => {
      expect(result.components).to.eql([
        'http://localhost:3030/container-with-multiple-nested',
        'http://localhost:3030/container-with-nested',
        'http://localhost:3030/empty',
        'http://localhost:3030/handlebars3-component',
        'http://localhost:3030/hello-world',
        'http://localhost:3030/hello-world-custom-headers',
        'http://localhost:3030/jade-filters',
        'http://localhost:3030/language',
        'http://localhost:3030/lodash-component',
        'http://localhost:3030/no-containers',
        'http://localhost:3030/welcome',
        'http://localhost:3030/welcome-with-optional-parameters',
        'http://localhost:3030/oc-client'
      ]);
    });
  });

  describe('GET /handlebars3-component', () => {
    before(done => {
      request(
        {
          url: 'http://localhost:3030/handlebars3-component',
          json: true
        },
        next(done)
      );
    });

    it('should respond with 500 status code', () => {
      expect(error).to.equal(500);
    });

    it('should respond with error for unsupported handlebars version', () => {
      expect(result.error).to.equal(
        "The component can't be rendered because it was published with an older OC version"
      );
    });
  });

  describe('GET /jade-filters', () => {
    before(done => {
      request(
        {
          url: 'http://localhost:3030/jade-filters',
          json: true
        },
        next(done)
      );
    });

    it('should respond with 200 status code', () => {
      expect(status).to.equal(200);
    });
  });

  describe('GET /hello-world', () => {
    describe('when Accept header not specified', () => {
      before(done => {
        request(
          {
            url: 'http://localhost:3030/hello-world',
            json: true
          },
          next(done)
        );
      });

      it('should respond with the correct href', () => {
        expect(result.href).to.eql('http://localhost:3030/hello-world');
      });

      it('should respond with requested version', () => {
        expect(result.requestVersion).to.eql('');
      });

      it('should respond with resolved version', () => {
        expect(result.version).to.eql('1.0.0');
      });

      it('should respond with component name', () => {
        expect(result.name).to.eql('hello-world');
      });

      it('should respond with the rendered template', () => {
        expect(result.html).to.exist;
        expect(result.html).to.match(
          /<oc-component (.*?)>Hello world!<script>(.*?)<\/script><\/oc-component>/g
        );
      });

      it('should respond with render type = rendered', () => {
        expect(result.renderMode).to.equal('rendered');
      });
    });

    describe('when Accept header set to application/vnd.oc.unrendered+json', () => {
      before(done => {
        request(
          {
            url: 'http://localhost:3030/hello-world',
            headers: { Accept: 'application/vnd.oc.unrendered+json' },
            json: true
          },
          next(done)
        );
      });

      it('should respond with the correct href', () => {
        expect(result.href).to.eql('http://localhost:3030/hello-world');
      });

      it('should respond with requested version', () => {
        expect(result.requestVersion).to.eql('');
      });

      it('should respond with resolved version', () => {
        expect(result.version).to.eql('1.0.0');
      });

      it('should respond with component name', () => {
        expect(result.name).to.eql('hello-world');
      });

      it('should respond with the un-rendered template', () => {
        expect(result.template).to.exist;
      });

      it('should respond with proper render type', () => {
        expect(result.renderMode).to.equal('unrendered');
      });
    });
  });

  describe('GET /container-with-nested', () => {
    before(done => {
      request(
        {
          url: 'http://localhost:3030/container-with-nested',
          json: true
        },
        next(done)
      );
    });

    it('should respond with the correct href', () => {
      expect(result.href).to.eql('http://localhost:3030/container-with-nested');
    });

    it('should respond with the rendered template including the nested rendered component', () => {
      expect(result.html).to.equal(
        '<div>Hi, this is a nested component: Hello world!</div>'
      );
    });

    it('should respond with proper render type', () => {
      expect(result.renderMode).to.equal('rendered');
    });
  });

  describe('GET /container-with-multiple-nested', () => {
    before(done => {
      request(
        {
          url: 'http://localhost:3030/container-with-multiple-nested',
          json: true
        },
        next(done)
      );
    });

    it('should respond with the correct href', () => {
      expect(result.href).to.eql(
        'http://localhost:3030/container-with-multiple-nested'
      );
    });

    it('should respond with the rendered template including the nested rendered component', () => {
      expect(result.html).to.equal(
        '<div>Hi, these are nested components:<ul><li><span>hi Jane Doe  </span></li><li><span>hi John Doe  </span></li></ul></div>'
      );
    });

    it('should respond with proper render type', () => {
      expect(result.renderMode).to.equal('rendered');
    });
  });

  describe('GET /no-containers', () => {
    describe('when Accept header not specified', () => {
      before(done => {
        request(
          {
            url: 'http://localhost:3030/no-containers',
            json: true
          },
          next(done)
        );
      });

      it('should respond with the correct href', () => {
        expect(result.href).to.eql('http://localhost:3030/no-containers');
      });

      it('should respond with the rendered template without the outer container and without render info script', () => {
        expect(result.html).to.exist;
        expect(result.html).to.equal('Hello world!');
      });

      it('should respond with proper render type', () => {
        expect(result.renderMode).to.equal('rendered');
      });
    });
  });

  describe('GET /language', () => {
    describe('when Accept-Language: en-US', () => {
      before(done => {
        request(
          {
            url: 'http://localhost:3030/language',
            json: true,
            headers: { 'accept-language': 'en-US' }
          },
          next(done)
        );
      });

      it('should respond with correct href', () => {
        expect(result.href).to.equal('http://localhost:3030/language');
      });

      it('should contain english language', () => {
        expect(result.html).to.equal('<p>selected language is english</p>');
      });
    });

    describe('when Accept-Language: ja-JP', () => {
      before(done => {
        request(
          {
            url: 'http://localhost:3030/language',
            json: true,
            headers: { 'accept-language': 'ja-JP' }
          },
          next(done)
        );
      });

      it('should respond with correct href', () => {
        expect(result.href).to.equal('http://localhost:3030/language');
      });

      it('should contain japanese language', () => {
        expect(result.html).to.equal('<p>selected language is japanese</p>');
      });
    });

    describe('when Accept-Language: ja-JP but __ocAcceptLanguage overrides with en-US (client-side failover)', () => {
      before(done => {
        request(
          {
            url: 'http://localhost:3030/language/?__ocAcceptLanguage=en-US',
            json: true,
            headers: { 'accept-language': 'ja-JP' }
          },
          next(done)
        );
      });

      it('should respond with correct href', () => {
        expect(result.href).to.equal('http://localhost:3030/language');
      });

      it('should contain japanese language', () => {
        expect(result.html).to.equal('<p>selected language is english</p>');
      });
    });
  });

  describe('GET /lodash-component', () => {
    before(done => {
      request(
        {
          url: 'http://localhost:3030/lodash-component',
          json: true
        },
        next(done)
      );
    });

    it('should respond with the correct href', () => {
      expect(result.href).to.eql('http://localhost:3030/lodash-component');
    });

    it('should respond correctly after using lodash server dependency', () => {
      expect(result.html).to.equal('<div>The magic number is 5</div>');
    });
  });

  describe('GET /empty', () => {
    describe('rendered', () => {
      before(done => {
        request(
          {
            url: 'http://localhost:3030/empty',
            json: true
          },
          next(done)
        );
      });

      it('should respond with the correct href', () => {
        expect(result.href).to.eql('http://localhost:3030/empty');
      });

      it('should respond with an empty response', () => {
        expect(result.html).to.equal('');
      });
    });

    describe('unrendered', () => {
      before(done => {
        request(
          {
            url: 'http://localhost:3030/empty',
            headers: { Accept: 'application/vnd.oc.unrendered+json' },
            json: true
          },
          next(done)
        );
      });

      it('should respond with the correct href', () => {
        expect(result.href).to.eql('http://localhost:3030/empty');
      });

      it('should respond with a minimal empty view-model', () => {
        expect(result.data).to.eql({
          [emptyResponseHandler.viewModelEmptyKey]: true
        });
      });
    });
  });

  describe('POST /', () => {
    describe('when body is malformed', () => {
      before(done => {
        request(
          {
            url: 'http://localhost:3030/',
            method: 'post',
            json: true,
            body: {}
          },
          next(done)
        );
      });

      it('should respond with 400 status code', () => {
        expect(error).to.equal(400);
      });

      it('should respond with error', () => {
        expect(result.error).to.equal(
          'The request body is malformed: components property is missing'
        );
      });
    });

    describe('when body contains multiple components', () => {
      describe('when Accept header not specified', () => {
        before(done => {
          request(
            {
              url: 'http://localhost:3030/',
              method: 'post',
              json: true,
              body: {
                components: [{ name: 'hello-world' }, { name: 'no-containers' }]
              }
            },
            next(done)
          );
        });

        it('should respond with two 200 status codes', () => {
          expect(result[0].status).to.equal(200);
          expect(result[1].status).to.equal(200);
        });

        it('should respond with two rendered components', () => {
          expect(result[0].response.html).to.match(
            /<oc-component (.*?)>Hello world!<script>(.*?)<\/script><\/oc-component>/g
          );
          expect(result[0].response.renderMode).to.equal('rendered');
          expect(result[1].response.html).to.equal('Hello world!');
          expect(result[1].response.renderMode).to.equal('rendered');
        });
      });

      describe('when omitHref=true', () => {
        describe('when getting rendered components', () => {
          before(done => {
            request(
              {
                url: 'http://localhost:3030/',
                method: 'post',
                json: true,
                body: {
                  omitHref: true,
                  components: [
                    { name: 'hello-world' },
                    { name: 'no-containers' }
                  ]
                }
              },
              next(done)
            );
          });

          it('should respond without href parameter', () => {
            expect(result[0].response.href).not.to.exist;
            expect(result[1].response.href).not.to.exist;
          });
        });

        describe('when getting unrendered components', () => {
          before(done => {
            request(
              {
                url: 'http://localhost:3030/',
                method: 'post',
                headers: { Accept: 'application/vnd.oc.unrendered+json' },
                json: true,
                body: {
                  omitHref: true,
                  components: [
                    { name: 'hello-world' },
                    { name: 'no-containers' }
                  ]
                }
              },
              next(done)
            );
          });

          it('should respond without href parameter', () => {
            expect(result[0].response.href).not.to.exist;
            expect(result[1].response.href).not.to.exist;
          });
        });
      });

      describe('when Accept header set to application/vnd.oc.unrendered+json', () => {
        before(done => {
          request(
            {
              url: 'http://localhost:3030/',
              method: 'post',
              headers: { Accept: 'application/vnd.oc.unrendered+json' },
              json: true,
              body: {
                components: [{ name: 'hello-world' }, { name: 'no-containers' }]
              }
            },
            next(done)
          );
        });

        it('should respond with two unrendered components', () => {
          expect(result[0].response.template).to.exist;
          expect(result[0].response.renderMode).to.equal('unrendered');
          expect(result[1].response.template).to.exist;
          expect(result[1].response.renderMode).to.equal('unrendered');
        });
      });

      describe('when components require params', () => {
        describe('when each component requires different params', () => {
          before(done => {
            request(
              {
                url: 'http://localhost:3030/',
                method: 'post',
                json: true,
                body: {
                  components: [
                    {
                      name: 'welcome',
                      parameters: { firstName: 'Mickey', lastName: 'Mouse' }
                    },
                    {
                      name: 'welcome',
                      parameters: { firstName: 'Donald', lastName: 'Duck' }
                    }
                  ]
                }
              },
              next(done)
            );
          });

          it('should render components with expected parameters', () => {
            expect(result[0].response.href).to.equal(
              'http://localhost:3030/welcome?firstName=Mickey&lastName=Mouse'
            );
            expect(result[1].response.href).to.equal(
              'http://localhost:3030/welcome?firstName=Donald&lastName=Duck'
            );
          });
        });

        describe('when components require same parameters', () => {
          before(done => {
            request(
              {
                url: 'http://localhost:3030/',
                method: 'post',
                json: true,
                body: {
                  parameters: { firstName: 'Donald', lastName: 'Duck' },
                  components: [{ name: 'welcome' }, { name: 'welcome' }]
                }
              },
              next(done)
            );
          });

          it('should render components with expected parameters', () => {
            expect(result[0].response.href).to.equal(
              'http://localhost:3030/welcome?firstName=Donald&lastName=Duck'
            );
            expect(result[1].response.href).to.equal(
              'http://localhost:3030/welcome?firstName=Donald&lastName=Duck'
            );
          });
        });

        describe('when components have some common parameters and some different', () => {
          before(done => {
            request(
              {
                url: 'http://localhost:3030/',
                method: 'post',
                json: true,
                body: {
                  parameters: { firstName: 'Donald' },
                  components: [
                    { name: 'welcome', parameters: { lastName: 'Mouse' } },
                    { name: 'welcome', parameters: { lastName: 'Duck' } }
                  ]
                }
              },
              next(done)
            );
          });

          it('should render components with expected parameters', () => {
            expect(result[0].response.href).to.equal(
              'http://localhost:3030/welcome?firstName=Donald&lastName=Mouse'
            );
            expect(result[1].response.href).to.equal(
              'http://localhost:3030/welcome?firstName=Donald&lastName=Duck'
            );
          });
        });

        describe('when components have global parameters with local overrides', () => {
          before(done => {
            request(
              {
                url: 'http://localhost:3030/',
                method: 'post',
                json: true,
                body: {
                  parameters: { firstName: 'Donald', lastName: 'Duck' },
                  components: [
                    { name: 'welcome', parameters: { lastName: 'Mouse' } },
                    { name: 'welcome' }
                  ]
                }
              },
              next(done)
            );
          });

          it('should render components with expected parameters', () => {
            expect(result[0].response.href).to.equal(
              'http://localhost:3030/welcome?firstName=Donald&lastName=Mouse'
            );
            expect(result[1].response.href).to.equal(
              'http://localhost:3030/welcome?firstName=Donald&lastName=Duck'
            );
          });
        });

        describe('when components accept optional parameters', () => {
          before(done => {
            request(
              {
                url: 'http://localhost:3030/',
                method: 'post',
                json: true,
                body: {
                  parameters: { firstName: 'John' },
                  components: [
                    {
                      name: 'welcome-with-optional-parameters',
                      parameters: { lastName: 'Smith', nick: 'smithy' }
                    },
                    {
                      name: 'welcome-with-optional-parameters',
                      parameters: { lastName: 'Smith', nick: null }
                    },
                    {
                      name: 'welcome-with-optional-parameters',
                      parameters: { lastName: 'Smith' }
                    },
                    {
                      name: 'welcome-with-optional-parameters',
                      parameters: { nick: 'smithy' }
                    }
                  ]
                }
              },
              next(done)
            );
          });

          it('should render first component with provided parameters', () => {
            expect(result[0].response.html).to.equal(
              '<span>hi John Smith (smithy)</span>'
            );
            expect(result[0].response.href).to.equal(
              'http://localhost:3030/welcome-with-optional-parameters?firstName=John&lastName=Smith&nick=smithy'
            );
          });

          it('should render second and third components with default value of nick', () => {
            expect(result[1].response.html).to.equal(
              '<span>hi John Smith (Johnny)</span>'
            );
            expect(result[1].response.href).to.equal(
              'http://localhost:3030/welcome-with-optional-parameters?firstName=John&lastName=Smith&nick=Johnny'
            );
            expect(result[2].response.html).to.equal(
              '<span>hi John Smith (Johnny)</span>'
            );
            expect(result[2].response.href).to.equal(
              'http://localhost:3030/welcome-with-optional-parameters?firstName=John&lastName=Smith&nick=Johnny'
            );
          });

          it('should render fourth component without value of lastName', () => {
            expect(result[3].response.html).to.equal(
              '<span>hi John  (smithy)</span>'
            );
            expect(result[3].response.href).to.equal(
              'http://localhost:3030/welcome-with-optional-parameters?firstName=John&nick=smithy'
            );
          });
        });
      });
    });
  });
});
