'use strict';

const cheerio = require('cheerio');
const expect = require('chai').expect;
const path = require('path');

describe('The node.js OC client', () => {

  let registry,
    client,
    clientOfflineRegistry,
    result,
    $component;

  const oc = require('../../src/index'),
    conf = {
      local: true,
      path: path.resolve('test/fixtures/components'),
      port: 3030,
      baseUrl: 'http://localhost:3030/',
      env: { name: 'local' },
      verbosity: 0
    };

  const getClientConfig = function(port){
    return {
      registries: {
        clientRendering: 'http://localhost:' + port,
        serverRendering: 'http://localhost:' + port
      },
      components: {
        'hello-world': '~1.0.0',
        'no-containers': ''
      }
    };
  };

  const getRegExpFromJson = function(x){
    return JSON.stringify(x)
      .replace(/\+/g, '\\+')
      .replace(/\[/g, '\\[')
      .replace(/\?\?/g, '\\?'); //In our json regexp in order to preserve a single ? we are escaping it  with ??
  };

  describe('when initialised providing registries properties', () => {

    before((done) => {
      client = new oc.Client(getClientConfig(3030));
      clientOfflineRegistry = new oc.Client(getClientConfig(1234));
      registry = new oc.Registry(conf);
      registry.start(done);
    });

    after((done) => {
      registry.close(done);
    });

    describe('when rendering 2 components', () => {
      describe('when components require params', () => {
        describe('when each component requires different params', () => {
          let $components;
          let $errs;
          before((done) => {
            client.renderComponents([{
              name: 'welcome',
              parameters: {
                firstName: 'Jane',
                lastName: 'Marple'
              }
            }, {
              name: 'welcome',
              parameters: {
                firstName: 'Hercule',
                lastName: 'Poirot'
              }
            }], { container: false, renderInfo: false }, (err, html) => {
              $errs = err;
              $components = html;
              done();
            });
          });

          it('should return rendered contents', () => {
            expect($components[0]).to.contain('hi Jane Marple');
            expect($components[1]).to.contain('hi Hercule Poirot');
          });

          it('should return null errors', () => {
            expect($errs).to.be.null;
          });
        });

        describe('when each component requires the same params', () => {
          let $components;
          let $errs;
          before((done) => {
            client.renderComponents([{
              name: 'welcome'
            }, {
              name: 'welcome'
            }], {
              container: false,
              parameters: {
                firstName: 'Jane',
                lastName: 'Marple'
              },
              renderInfo: false
            }, (err, html) => {
              $errs = err;
              $components = html;
              done();
            });
          });

          it('should return rendered contents', () => {
            expect($components[0]).to.contain('hi Jane Marple');
            expect($components[1]).to.contain('hi Jane Marple');
          });

          it('should return null errors', () => {
            expect($errs).to.be.null;
          });
        });

        describe('when components have some common parameters and some different', () => {
          let $components;
          let $errs;
          before((done) => {
            client.renderComponents([{
              name: 'welcome',
              parameters: {
                lastName: 'Poirot'
              }
            }, {
              name: 'welcome',
              parameters: {
                firstName: 'Jane'
              }
            }], {
              container: false,
              parameters: {
                firstName: 'Hercule',
                lastName: 'Marple'
              },
              renderInfo: false
            }, (err, html) => {
              $errs = err;
              $components = html;
              done();
            });
          });

          it('should return rendered contents', () => {
            expect($components[0]).to.contain('hi Hercule Poirot');
            expect($components[1]).to.contain('hi Jane Marple');
          });

          it('should return null errors', () => {
            expect($errs).to.be.null;
          });
        });
      });

      describe('when rendering both on the server-side', () => {
        let $components;
        let $errs;
        before((done) => {
          client.renderComponents([{
            name: 'hello-world'
          }, {
            name: 'no-containers'
          }], { container: false, renderInfo: false }, (err, html) => {
            $errs = err;
            $components = {
              'hello-world': html[0],
              'no-containers': html[1]
            };
            done();
          });
        });

        it('should return rendered contents', () => {
          expect($components['hello-world']).to.equal('Hello world!');
          expect($components['no-containers']).to.equal('Hello world!');
        });

        it('should return null errors', () => {
          expect($errs).to.be.null;
        });
      });

      describe('when the request body is malformed', () => {
        let error, result;

        before((done) => {
          client.renderComponents([{
            //Empty
          }, {
            //Empty
          }], {disableFailoverRendering: true}, (err, res) => {
            error = err;
            result = res;
            done();
          });
        });

        const expectedRequest = {
          url: 'http://localhost:3030',
          method: 'post',
          headers: {
            'user-agent': 'oc-client-(.*?)',
            'accept': 'application/vnd.oc.unrendered+json'
          },
          timeout: 5,
          json: true,
          body: {
            components: [{},{}],
            parameters: {}
          }
        };

        it('should contain a blank html response', () => {
          expect(result).to.deep.equal(['', '']);
        });

        it('should contain the error details', () => {
          expect(error).to.be.Array;
          expect(error.length).to.be.equal(2);

          const exp = getRegExpFromJson(expectedRequest),
            expected = new RegExp('Error: Server-side rendering failed: request ' + exp + ' failed \\' +
                         '(400 The request body is malformed: component 0 must have name property, ' +
                         'component 1 must have name property\\)');

          expect(error[0].toString()).to.match(expected);
          expect(error[1].toString()).to.match(expected);
        });
      });

      describe('when rendering both on the client-side', () => {
        let $components;
        before((done) => {
          client.renderComponents([{
            name: 'hello-world'
          }, {
            name: 'no-containers'
          }], { container: false, renderInfo: false, render: 'client' }, (err, html) => {
            $components = {
              'hello-world': cheerio.load(html[0])('oc-component'),
              'no-containers': cheerio.load(html[1])('oc-component')
            };
            done();
          });
        });

        it('should return browser oc tags', () => {
          expect($components['hello-world'].attr('href')).to.equal('http://localhost:3030/hello-world/~1.0.0');
          expect($components['no-containers'].attr('href')).to.equal('http://localhost:3030/no-containers');
        });
      });

      describe('when rendering one on the server, one on the client', () => {
        let $components;
        before((done) => {
          client.renderComponents([{
            name: 'hello-world',
            render: 'server'
          }, {
            name: 'no-containers',
            render: 'client'
          }], { container: false, renderInfo: false }, (err, html) => {
            $components = {
              'hello-world': html[0],
              'no-containers': cheerio.load(html[1])('oc-component')
            };
            done();
          });
        });

        it('should return rendered content for rendered component', () => {
          expect($components['hello-world']).to.equal('Hello world!');
        });

        it('should return browser oc tag for unrendered component', () => {
          expect($components['no-containers'].attr('href')).to.equal('http://localhost:3030/no-containers');
        });
      });

      describe('when rendering one with container, one without container', () => {
        let $components;
        before((done) => {
          client.renderComponents([{
            name: 'hello-world',
            container: true
          }, {
            name: 'hello-world',
            container: false
          }], { renderInfo: false }, (err, html) => {
            $components = {
              'with': html[0],
              'without': html[1]
            };
            done();
          });
        });

        it('should return first component with container', () => {
          const $component = cheerio.load($components.with)('oc-component');
          expect($component.text()).to.equal('Hello world!');
        });

        it('should return second component without container', () => {
          expect($components.without).to.equal('Hello world!');
        });
      });

      describe('when there are errors in some of them', () => {
        let $errs;
        before((done) => {
          client.renderComponents([{
            name: 'hello-world-i-dont-exist'
          }, {
            name: 'no-containers'
          }, {
            name: 'errors-component',
            parameters: {
              errorType: '500'
            }
          }], {
            container: false,
            renderInfo: false,
            disableFailoverRendering: true
          }, (err) => {
            $errs = err;
            done();
          });
        });

        it('should return an error for each component with error', () => {
          expect($errs[0].toString()).to.be.equal('Error: Server-side rendering failed: Component "hello-world-i-dont-exist" not found on local repository (404)');
          expect($errs[1]).to.be.null;
          expect($errs[2].toString()).to.be.equal('Error: Server-side rendering failed: Component execution error: An error happened (500)');
        });
      });
    });

    describe('when server-side rendering an existing component linked to a responsive registry', () => {

      before((done) => {
        client.renderComponent('hello-world', { container: true }, (err, html) => {
          $component = cheerio.load(html)('oc-component');
          done();
        });
      });

      it('should use the serverRendering url', () => {
        expect($component.attr('href')).to.equal('http://localhost:3030/hello-world/~1.0.0');
        expect($component.data('rendered')).to.equal(true);
      });
    });

    describe('when server-side rendering an existing component overriding registry urls', () => {

      before((done) => {
        const options = {
          container: true,
          registries: {
            clientRendering: 'http://localhost:3030',
            serverRendering: 'http://localhost:3030'
          }
        };

        clientOfflineRegistry.renderComponent('hello-world', options, (err, html) => {
          $component = cheerio.load(html)('oc-component');
          done();
        });
      });

      it('should use the overwritten serverRendering url', () => {
        expect($component.attr('href')).to.equal('http://localhost:3030/hello-world/~1.0.0');
        expect($component.data('rendered')).to.equal(true);
      });
    });

    describe('when client-side rendering an existing component overriding registry urls', () => {

      before((done) => {
        const options = {
          container: true,
          registries: {
            clientRendering: 'http://localhost:3030',
            serverRendering: 'http://localhost:3030'
          },
          render: 'client'
        };

        clientOfflineRegistry.renderComponent('hello-world', options, (err, html) => {
          $component = cheerio.load(html)('oc-component');
          done();
        });
      });

      it('should use the overwritten clientRendering url', () => {
        expect($component.attr('href')).to.equal('http://localhost:3030/hello-world/~1.0.0');
      });
    });

    describe('when client-side rendering an existing component', () => {

      before((done) => {
        clientOfflineRegistry.renderComponent('hello-world', { render: 'client' }, (err, html) => {
          $component = cheerio.load(html)('oc-component');
          done();
        });
      });

      it('should use clientRendering url', () => {
        expect($component.attr('href')).to.equal('http://localhost:1234/hello-world/~1.0.0');
      });
    });

    describe('when getting components info for 2 existing component', () => {
      let error;
      let info;

      before((done) => {
        client.getComponentsInfo([{
          name: 'hello-world'
        }, {
          name: 'no-containers',
          version: '1.x.x'
        }], ($error, $info) => {
          error = $error;
          info = $info;
          done();
        });
      });

      const expectedInfo = [{
        componentName: 'hello-world',
        requestedVersion: undefined,
        apiResponse: {
          name: 'hello-world',
          requestVersion: '',
          type: 'oc-component-local',
          version: '1.0.0'
        }
      }, {
        componentName: 'no-containers',
        requestedVersion: '1.x.x',
        apiResponse: {
          name: 'no-containers',
          requestVersion: '1.x.x',
          type: 'oc-component-local',
          version: '1.0.0'
        }
      }];

      it('should return valid info', () => {
        expect(error).to.be.null();
        expect(info).to.be.deep.equal(expectedInfo);
      });

    });

    describe('when getting components info for 1 existing, 1 with higher version and 1 non-existing components', () => {
      let error;
      let info;

      before((done) => {
        client.getComponentsInfo([{
          name: 'hello-world'
        }, {
          name: 'no-containers',
          version: '3.5.7'
        }, {
          name: 'non-existing',
          version: '1.x.x'
        }], ($error, $info) => {
          error = $error;
          info = $info;
          done();
        });
      });

      it('should return both valid info and error', () => {
        expect(error).to.be.ok;
        expect(error).to.be.instanceof(Array);
        expect(error.length).to.be.equal(3);

        expect(info).to.be.ok;
        expect(info).to.be.instanceof(Array);
        expect(info.length).to.be.equal(3);
      });

      it('should return correct info for the 1st component', () => {
        const expectedFirstComponentInfo = [{
          componentName: 'hello-world',
          requestedVersion: undefined,
          apiResponse: {
            name: 'hello-world',
            requestVersion: '',
            type: 'oc-component-local',
            version: '1.0.0'
          }
        }];

        expect(info[0]).to.be.deep.equal(expectedFirstComponentInfo[0]);
      });

      it('should return info with errors for the 2nd and 3rd component', () => {
        expect(info[1].componentName).to.be.equal('no-containers');
        expect(info[1].requestedVersion).to.be.equal('3.5.7');
        expect(info[1].error.message).to.be.equal('Getting component info failed: Component "no-containers" with version "3.5.7" not found on local repository (404)');

        expect(info[2].componentName).to.be.equal('non-existing');
        expect(info[2].requestedVersion).to.be.equal('1.x.x');
        expect(info[2].error.message).to.be.equal('Getting component info failed: Component "non-existing" not found on local repository (404)');
      });

      it('should return error array with errors for the 2nd and 3rd components', () => {
        expect(error[0]).to.not.be.ok;
        expect(error[1].message).to.be.equal('Getting component info failed: Component "no-containers" with version "3.5.7" not found on local repository (404)');
        expect(error[2].message).to.be.equal('Getting component info failed: Component "non-existing" not found on local repository (404)');
      });
    });
  });

  describe('when correctly initialised', () => {

    before((done) => {
      client = new oc.Client(getClientConfig(3030));
      clientOfflineRegistry = new oc.Client(getClientConfig(1234));
      registry = new oc.Registry(conf);
      registry.start(done);
    });

    after((done) => {
      registry.close(done);
    });

    describe('when server-side rendering an existing component linked to a non responsive registry', () => {

      const expectedRequest = {
        url: 'http://localhost:1234/hello-world/~1.0.0',
        method: 'get',
        headers: {
          'user-agent': 'oc-client-(.*?)',
          'accept': 'application/vnd.oc.unrendered+json'
        },
        timeout: 5,
        json: true
      };

      describe('when client-side failover rendering disabled', () => {

        let error;

        before((done) => {
          const options = { disableFailoverRendering: true };

          clientOfflineRegistry.renderComponent('hello-world', options, (err, html) => {
            result = html;
            error = err;
            done();
          });
        });

        it('should contain a blank html response', () => {
          expect(result).to.eql('');
        });

        it('should contain the error details', () => {

          const exp = getRegExpFromJson(expectedRequest),
            expected = new RegExp('Error: Server-side rendering failed: request ' + exp + ' failed \\(Error: connect ECONNREFUSED(.*?)\\)');

          const actual = error.toString();
          expect(actual).to.match(expected);
        });
      });

      describe('when client-side failover rendering enabled (default)', () => {

        let $clientScript,
          error;

        before((done) => {
          clientOfflineRegistry.renderComponent('hello-world', (err, html) => {
            error = err;
            const $ = cheerio.load(html);
            $component = $('oc-component');
            $clientScript = $('script.ocClientScript');
            done();
          });
        });

        it('should include the client-side rendering script', () => {
          expect($clientScript).to.have.length.above(0);
        });

        it('should return non rendered contents', () => {
          expect($component).to.exist();
          expect($component.data('rendered')).to.be.undefined;
        });

        it('should contain the component url', () => {
          expect($component.attr('href')).to.equal('http://localhost:1234/hello-world/~1.0.0');
        });

        it('should contain the error details', () => {

          const exp = getRegExpFromJson(expectedRequest),
            expected = new RegExp('Error: Server-side rendering failed: request ' + exp + ' failed \\(Error: connect ECONNREFUSED(.*?)\\)');

          expect(error.toString()).to.match(expected);
        });
      });

      describe('when client-side failover rendering enabled with forwardAcceptLanguageToClient=true', () => {

        let $clientScript,
          error;
        const options = {
          forwardAcceptLanguageToClient: true,
          parameters: {
            hi: 'john'
          },
          headers: {
            'accept-language': 'da, en-gb;q=0.8, en;q=0.7'
          }
        };

        before((done) => {
          clientOfflineRegistry.renderComponent('hello-world', options, (err, html) => {
            error = err;
            const $ = cheerio.load(html);
            $component = $('oc-component');
            $clientScript = $('script.ocClientScript');
            done();
          });
        });

        it('should include the client-side rendering script', () => {
          expect($clientScript).to.have.length.above(0);
        });

        it('should contain the component url including parameters and __ocAcceptLanguage parameter', () => {
          const u = 'http://localhost:1234/hello-world/~1.0.0/?hi=john&__ocAcceptLanguage=da%2C%20en-gb%3Bq%3D0.8%2C%20en%3Bq%3D0.7';
          expect($component.attr('href')).to.equal(u);
        });

        it('should contain the error details', () => {

          const expectedRequestWithExtraParams = {
            url: 'http://localhost:1234/hello-world/~1.0.0/??hi=john',
            method: 'get',
            headers: {
              'accept-language': 'da, en-gb;q=0.8, en;q=0.7',
              'user-agent': 'oc-client-(.*?)',
              'accept': 'application/vnd.oc.unrendered+json',
            },
            timeout: 5,
            json: true
          };

          const exp = getRegExpFromJson(expectedRequestWithExtraParams),
            expected = new RegExp('Error: Server-side rendering failed: request ' + exp + ' failed \\(Error: connect ECONNREFUSED(.*?)\\)');

          expect(error.toString()).to.match(expected);
        });
      });
    });

    describe('when server-side rendering an existing component linked to a responsive registry', () => {

      describe('when the component is missing', () => {
        let error, result;

        before((done) => {
          client.renderComponent('non-existing-component', {
            disableFailoverRendering: true
          }, (err, html) => {
            error = err;
            result = html;
            done();
          });
        });

        const expectedRequest = {
          url: 'http://localhost:3030/non-existing-component',
          method: 'get',
          headers: {
            'user-agent': 'oc-client-(.*?)',
            'accept': 'application/vnd.oc.unrendered+json',
          },
          timeout: 5,
          json: true
        };

        it('should contain a blank html response', () => {
          expect(result).to.eql('');
        });

        it('should contain the error details', () => {
          const exp = getRegExpFromJson(expectedRequest),
            expected = new RegExp('Error: Server-side rendering failed: request ' + exp + ' failed ' +
                         '\\(404 Component "non-existing-component" not found on local repository\\)');

          expect(error.toString()).to.match(expected);
        });
      });

      describe('when the component times-out', () => {

        let error, result;

        const expectedRequest = {
          url: 'http://localhost:3030/errors-component/??errorType=timeout&timeout=1000',
          method: 'get',
          headers: {
            'user-agent': 'oc-client-(.*?)',
            'accept': 'application/vnd.oc.unrendered+json',
          },
          timeout: 0.01,
          json: true
        };

        before((done) => {
          client.renderComponent('errors-component', {
            parameters: { errorType: 'timeout', timeout: 1000 },
            timeout: 0.01,
            disableFailoverRendering: true
          }, (err, html) => {
            error = err;
            result = html;
            done();
          });
        });

        it('should contain a blank html response', () => {
          expect(result).to.eql('');
        });

        it('should contain the error details', () => {

          const exp = getRegExpFromJson(expectedRequest),
            expected = new RegExp('Error: Server-side rendering failed: request ' + exp + ' failed \\(timeout\\)');

          expect(error.toString()).to.match(expected);
        });
      });

      describe('when container option = true', () => {
        let error;
        before((done) => {
          client.renderComponent('hello-world', { container: true }, (err, html) => {
            error = err;
            $component = cheerio.load(html)('oc-component');
            done();
          });
        });

        it('should return rendered contents', () => {
          expect($component).to.exist();
          expect($component.data('rendered')).to.eql(true);
        });

        it('should contain the hashed view\'s key', () => {
          expect($component.data('hash')).to.equal('c6fcae4d23d07fd9a7e100508caf8119e998d7a9');
        });

        it('should return expected html', () => {
          expect($component.text()).to.contain('Hello world!');
        });

        it('should contain the component version', () => {
          expect($component.data('version')).to.equal('1.0.0');
        });

        it('should contain a null error', () => {
          expect(error).to.be.null;
        });
      });

      describe('when container option = false', () => {
        before((done) => {
          client.renderComponent('hello-world', { container: false, renderInfo: false }, (err, html) => {
            result = html;
            done();
          });
        });

        it('should return expected html without the container', () => {
          expect(result).to.equal('Hello world!');
        });
      });
    });

    describe('when getting components info with a non responsive registry', () => {
      let error;
      let info;

      before((done) => {
        clientOfflineRegistry.getComponentsInfo([{
          name: 'hello-world'
        },{
          name: 'other-component',
          version: '1.0.0'
        }], ($error, $info) => {
          error = $error;
          info = $info;
          done();
        });
      });

      const expectedRequest = {
        url: 'http://localhost:1234',
        method: 'post',
        headers: {
          'user-agent': 'oc-client-(.*?)',
          'accept': 'application/vnd.oc.info+json'
        },
        timeout: 5,
        json: true,
        body: {
          components: [{
            name: 'hello-world'
          },{
            name: 'other-component',
            version: '1.0.0'
          }]
        }
      };

      const exp = getRegExpFromJson(expectedRequest);
      const expectedError = new RegExp('Getting component info failed: request ' + exp + ' failed \\(Error: connect ECONNREFUSED(.*?)\\)');

      it('should fail and return an errors array with an error corresponding to every component requested', () => {
        expect(error).to.not.be.undefined();
        expect(error).to.be.instanceof(Array);
        expect(error.length).to.be.equal(2);

        expect(error[0]).to.match(expectedError);
        expect(error[1]).to.match(expectedError);
      });

      it('return an info array with components requested together with an error for every component', () => {
        expect(info).to.not.be.undefined();
        expect(info).to.be.instanceof(Array);
        expect(info.length).to.be.equal(2);

        expect(info[0].componentName).to.be.equal('hello-world');
        expect(info[0].requestedVersion).to.be.undefined();
        expect(info[0].error).to.match(expectedError);

        expect(info[1].componentName).to.be.equal('other-component');
        expect(info[1].requestedVersion).to.be.equal('1.0.0');
        expect(info[1].error).to.match(expectedError);
      });
    });

  });
});