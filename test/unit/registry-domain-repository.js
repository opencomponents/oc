const expect = require('chai').expect;
const { readFileSync, readdirSync, lstatSync } = require('node:fs');
const injectr = require('injectr');
const path = require('node:path');
const sinon = require('sinon');

const readJsonSync = (path) => JSON.parse(readFileSync(path, 'utf8'));

describe('registry : domain : repository', () => {
  let response;
  const savePromiseResult = (promise, done) => {
    response = {};
    promise
      .then((res) => {
        response.result = res;
      })
      .catch((err) => {
        response.error = err;
      })
      .finally(done);
  };

  describe('when on cdn configuration', () => {
    const componentsCacheMock = {
      get: sinon.stub(),
      refresh: sinon.stub()
    };

    const componentsDetailsMock = {
      get: sinon.stub(),
      refresh: sinon.stub()
    };

    const fsMock = {
      readFileSync: readFileSync,
      readdirSync: readdirSync,
      lstatSync: lstatSync,
      readJsonSync: readJsonSync,
      writeFile: () => Promise.resolve()
    };

    const s3Mock = {
      getFile: sinon.stub().resolves(),
      listSubDirectories: sinon.stub().resolves(),
      putFile: sinon.stub().resolves(),
      getJson: sinon.stub().resolves(),
      putDir: sinon.stub().resolves(),
      putFileContent: sinon.stub().resolves(),
      adapterType: 's3'
    };

    const Repository = injectr(
      '../../dist/registry/domain/repository.js',
      {
        'node:fs': fsMock,
        'node:fs/promises': fsMock,
        './components-cache': () => componentsCacheMock,
        './components-details': () => componentsDetailsMock
      },
      { __dirname: path.resolve(__dirname, '../../dist/registry/domain') }
    ).default;

    const cdnConfiguration = {
      port: 3000,
      prefix: '/v2/',
      publishValidation: (pkg) => {
        const ok = !!pkg.author && !!pkg.repository;
        return ok ? ok : { isValid: false, error: 'forbidden!!!' };
      },
      baseUrl: 'http://saymyname.com:3000/v2/',
      env: { name: 'prod' },
      storage: {
        adapter: () => s3Mock,
        options: {
          key: 'a-key',
          secret: 'secrety-key',
          bucket: 'walter-test',
          region: 'us-west-2',
          componentsDir: 'components',
          path: 'https://s3.amazonaws.com/walter-test/'
        }
      }
    };

    const componentsCacheBaseResponse = {
      components: {
        'hello-world': ['1.0.0'],
        language: ['1.0.0'],
        'no-containers': ['1.0.0'],
        welcome: ['1.0.0'],
        'oc-client': ['1.0.0']
      }
    };

    const componentsDetailsBaseResponse = {
      components: { 'hello-world': { '1.0.0': { publishDate: 1234567890 } } }
    };

    const repository = Repository(cdnConfiguration);

    describe('when getting the list of available components', () => {
      before((done) => {
        componentsCacheMock.get.returns(componentsCacheBaseResponse);
        savePromiseResult(repository.getComponents(), done);
      });

      it('should fetch the list from the cache', () => {
        expect(componentsCacheMock.get.called).to.be.true;
      });

      it('should respond without an error', () => {
        expect(response.error).to.be.undefined;
      });

      it('should list the components', () => {
        expect(response.result).to.eql([
          'hello-world',
          'language',
          'no-containers',
          'welcome',
          'oc-client'
        ]);
      });
    });

    describe('when getting the components details', () => {
      before((done) => {
        componentsDetailsMock.get.resolves(componentsDetailsBaseResponse);
        savePromiseResult(repository.getComponentsDetails(), done);
      });

      it('should not error', () => {
        expect(response.error).to.be.undefined;
      });

      it('should return the result', () => {
        expect(response.result).to.eql(componentsDetailsBaseResponse);
      });
    });

    describe('when getting the list of supported templates', () => {
      describe('when no templates are specificed on the configuaration', () => {
        it('should return core templates', () => {
          expect(repository.getTemplatesInfo().length).to.equal(3);
          expect(repository.getTemplatesInfo()[0].type).to.equal(
            'oc-template-es6'
          );
          expect(repository.getTemplatesInfo()[1].type).to.equal(
            'oc-template-jade'
          );
          expect(repository.getTemplatesInfo()[2].type).to.equal(
            'oc-template-handlebars'
          );
        });
      });

      describe('when the templates specificed on the configuaration are core-templates', () => {
        it('should only return uniques templates', () => {
          const conf = Object.assign(cdnConfiguration, {
            templates: [require('oc-template-jade')]
          });
          const repository = Repository(conf);
          expect(repository.getTemplatesInfo().length).to.equal(3);
        });
      });

      describe('when templates specificed on the configuaration are not installed', () => {
        it('should throw an error', () => {
          try {
            const conf = Object.assign(cdnConfiguration, {
              templates: [require('oc-template-react')]
            });
            Repository(conf);
          } catch (err) {
            expect(err.message).to.have.contain(
              "Cannot find module 'oc-template-react'"
            );
          }
        });
      });
    });

    describe('when trying to get a not valid component', () => {
      describe('when the component does not exist', () => {
        before((done) => {
          componentsCacheMock.get.returns(componentsCacheBaseResponse);
          savePromiseResult(
            repository.getComponent('form-component', '1.0.0'),
            done
          );
        });

        it('should respond with a proper error', () => {
          expect(response.error).not.to.be.empty;
          expect(response.error).to.equal(
            'Component "form-component" not found on s3 cdn'
          );
        });
      });
      describe('when the get component info fails', () => {
        before((done) => {
          componentsCacheMock.get.returns(componentsCacheBaseResponse);
          sinon.stub(repository, 'getComponentInfo').callsFake(() =>
            Promise.reject({
              msg: 'File not valid',
              code: 'file_not_valid'
            })
          );
          savePromiseResult(
            repository.getComponent('hello-world', '1.0.0'),
            done
          );
        });
        after(() => {
          repository.getComponentInfo.restore();
        });
        it('should respond with a proper error', () => {
          expect(response.error).not.to.be.empty;
          expect(response.error).to.equal(
            'component not available: File not valid'
          );
        });
      });
      describe('when the component exists but version does not', () => {
        before((done) => {
          componentsCacheMock.get.returns(componentsCacheBaseResponse);
          savePromiseResult(
            repository.getComponent('hello-world', '2.0.0'),
            done
          );
        });

        it('should respond with a proper error', () => {
          expect(response.error).not.to.be.empty;
          expect(response.error).to.equal(
            'Component "hello-world" with version "2.0.0" not found on s3 cdn'
          );
        });
      });
    });

    describe('when getting an existing component', () => {
      before((done) => {
        componentsCacheMock.get.returns(componentsCacheBaseResponse);
        s3Mock.getJson.resolves({ name: 'hello-world', version: '1.0.0' });
        savePromiseResult(
          repository.getComponent('hello-world', '1.0.0'),
          done
        );
      });

      it('should respond without an error', () => {
        expect(response.error).to.be.undefined;
      });

      it("should fetch the versions' list from the cache", () => {
        expect(componentsCacheMock.get.called).to.be.true;
      });

      it('should fetch the component info from the correct package.json file', () => {
        expect(s3Mock.getJson.args[0][0]).to.equal(
          'components/hello-world/1.0.0/package.json'
        );
      });

      it('should return the component info', () => {
        expect(response.result).not.to.be.empty;
        expect(response.result.name).to.equal('hello-world');
        expect(response.result.version).to.equal('1.0.0');
      });
    });

    describe('when getting the .env file', () => {
      before((done) => {
        s3Mock.getFile.resolves(`
        VAR1=VAL1
        VAR2=VAL2
        `);
        savePromiseResult(repository.getEnv('hello-world', '1.0.0'), done);
      });

      it('should respond without an error', () => {
        expect(response.error).to.be.undefined;
      });

      it('should return the component info', () => {
        expect(response.result).not.to.be.empty;
        expect(response.result.VAR1).to.equal('VAL1');
        expect(response.result.VAR2).to.equal('VAL2');
      });
    });

    describe('when getting a static file url', () => {
      let url;
      before(() => {
        url = repository.getStaticFilePath('hello-world', '1.0.0', 'hi.txt');
      });

      it('should be using the static redirector from registry', () => {
        expect(url).to.equal(
          'https://s3.amazonaws.com/walter-test/components/hello-world/1.0.0/hi.txt'
        );
      });
    });

    describe('when publishing a component', () => {
      describe('when component has a not valid name', () => {
        before((done) => {
          savePromiseResult(
            repository.publishComponent({
              pkgDetails: {},
              componentName: 'blue velvet',
              componentVersion: '1.0.0'
            }),
            done
          );
        });

        it('should respond with an error', () => {
          expect(response.error).not.to.be.empty;
          expect(response.error.code).to.equal('name_not_valid');
          expect(response.error.msg).to.equal(
            "The component's name contains invalid characters. Allowed are alphanumeric, _, -"
          );
        });
      });

      describe('when component has a not valid version', () => {
        before((done) => {
          savePromiseResult(
            repository.publishComponent({
              pkgDetails: {},
              componentName: 'hello-world',
              componentVersion: '1.0'
            }),
            done
          );
        });

        it('should respond with an error', () => {
          expect(response.error).not.to.be.empty;
          expect(response.error.code).to.equal('version_not_valid');
          expect(response.error.msg).to.eql(
            'Version "1.0" is not a valid semantic version.'
          );
        });
      });

      describe('when component has a valid name and version', () => {
        const pkg = {
          packageJson: {
            name: 'hello-world',
            author: 'blargh',
            repository: 'asdfa',
            oc: {
              date: 1234567890
            }
          }
        };

        describe('when component with same name and version is already in library', () => {
          before((done) => {
            componentsCacheMock.get.returns(componentsCacheBaseResponse);
            savePromiseResult(
              repository.publishComponent({
                pkgDetails: pkg,
                componentName: 'hello-world',
                componentVersion: '1.0.0'
              }),
              done
            );
          });

          it('should respond with an error', () => {
            const message =
              `Component "hello-world" with version "1.0.0" can't be published ` +
              'to s3 cdn because a component with the same name and version already exists';

            expect(response.error).not.be.empty;
            expect(response.error.code).to.equal('already_exists');
            expect(response.error.msg).to.equal(message);
          });
        });

        describe('when is in check mode only', () => {
          before((done) => {
            componentsCacheMock.get = sinon.stub();
            componentsCacheMock.get.returns(componentsCacheBaseResponse);
            componentsCacheMock.refresh = sinon.stub();
            componentsCacheMock.refresh.resolves(componentsCacheBaseResponse);
            componentsDetailsMock.get.resolves(componentsDetailsBaseResponse);
            componentsDetailsMock.refresh.resolves(
              componentsDetailsBaseResponse
            );
            s3Mock.putDir = sinon.stub();
            s3Mock.putDir.resolves('done');
            savePromiseResult(
              repository.publishComponent({
                pkgDetails: {
                  ...pkg,
                  outputFolder: '/path/to/component',
                  componentName: 'hello-world'
                },
                componentName: 'hello-world',
                componentVersion: '1.0.1',
                dryRun: true
              }),
              done
            );
          });

          it('should not refresh cached components list', () => {
            expect(componentsCacheMock.refresh.called).to.be.false;
          });

          it('should not refresh componens details', () => {
            expect(componentsDetailsMock.refresh.called).to.be.false;
          });

          it('should not publish components', () => {
            expect(s3Mock.putDir.called).to.be.false;
          });
        });

        describe('when component with same name and version is not in library', () => {
          before((done) => {
            componentsCacheMock.get = sinon.stub();
            componentsCacheMock.get.returns(componentsCacheBaseResponse);
            componentsCacheMock.refresh = sinon.stub();
            componentsCacheMock.refresh.resolves(componentsCacheBaseResponse);
            componentsDetailsMock.get.resolves(componentsDetailsBaseResponse);
            componentsDetailsMock.refresh.resolves(
              componentsDetailsBaseResponse
            );
            s3Mock.putDir = sinon.stub();
            s3Mock.putDir.resolves('done');
            savePromiseResult(
              repository.publishComponent({
                pkgDetails: {
                  ...pkg,
                  outputFolder: '/path/to/component',
                  componentName: 'hello-world'
                },
                componentName: 'hello-world',
                componentVersion: '1.0.1'
              }),
              done
            );
          });

          it('should refresh cached components list', () => {
            expect(componentsCacheMock.refresh.called).to.be.true;
          });

          it('should refresh componens details', () => {
            expect(componentsDetailsMock.refresh.called).to.be.true;
            expect(componentsDetailsMock.refresh.args[0][0]).to.eql(
              componentsCacheBaseResponse
            );
          });

          it('should store the component in the correct directory', () => {
            expect(s3Mock.putDir.args[0][0]).to.equal('/path/to/component');
            expect(s3Mock.putDir.args[0][1]).to.equal(
              'components/hello-world/1.0.1'
            );
          });
        });
      });
    });
  });

  describe('when on local configuration', () => {
    const Repository = require('../../dist/registry/domain/repository').default;

    const localConfiguration = {
      local: true,
      path: path.resolve('test/fixtures/components'),
      port: 80,
      prefix: '/v2',
      baseUrl: 'http://localhost/v2/',
      env: { name: 'local' }
    };

    const repository = Repository(localConfiguration);

    describe('when getting the list of available components', () => {
      before((done) => {
        savePromiseResult(repository.getComponents(), done);
      });

      it('should respond without an error', () => {
        expect(response.error).to.be.undefined;
      });

      it('should list the components', () => {
        expect(response.result).to.eql([
          'circular-json-error',
          'container-with-multiple-nested',
          'container-with-nested',
          'empty',
          'handlebars3-component',
          'hello-world',
          'hello-world-custom-headers',
          'jade-filters',
          'language',
          'lodash-component',
          'no-containers',
          'welcome',
          'welcome-with-optional-parameters',
          'oc-client'
        ]);
      });
    });

    describe('when trying to get a not valid component', () => {
      describe('when the component does not exist', () => {
        before((done) => {
          savePromiseResult(
            repository.getComponent('form-component', '1.0.0'),
            done
          );
        });

        it('should respond with a proper error', () => {
          expect(response.error).not.to.be.empty;
          expect(response.error).to.equal(
            'Component "form-component" not found on local repository'
          );
        });
      });

      describe('when the component exists but version does not', () => {
        before((done) => {
          savePromiseResult(
            repository.getComponent('hello-world', '2.0.0'),
            done
          );
        });

        it('should respond with a proper error', () => {
          expect(response.error).not.to.be.empty;
          expect(response.error).to.equal(
            'Component "hello-world" with version "2.0.0" not found on local repository'
          );
        });
      });
    });

    describe('when getting an existing component', () => {
      before((done) => {
        savePromiseResult(
          repository.getComponent('hello-world', '1.0.0'),
          done
        );
      });

      it('should respond without an error', () => {
        expect(response.error).to.be.undefined;
      });

      it('should return the component info', () => {
        expect(response.result).not.to.be.empty;
        expect(response.result.name).to.equal('hello-world');
        expect(response.result.version).to.equal('1.0.0');
      });
    });

    describe('when getting a static file url', () => {
      let url;
      before(() => {
        url = repository.getStaticFilePath('hello-world', '1.0.0', 'hi.txt');
      });

      it('should be using the static redirector from registry', () => {
        expect(url).to.equal(
          'http://localhost/v2/hello-world/1.0.0/static/hi.txt'
        );
      });
    });

    describe('when trying to publish a component', () => {
      const componentDir = path.resolve('../fixtures/components/hello-world');

      before((done) => {
        savePromiseResult(
          repository.publishComponent({
            pkgDetails: componentDir,
            componentName: 'hello-world',
            componentVersion: '1.0.0'
          }),
          done
        );
      });

      it('should respond with an error', () => {
        expect(response.error).not.to.be.empty;
        expect(response.error.code).to.equal('not_allowed');
        expect(response.error.msg).to.equal(
          "Components can't be published to local repository"
        );
      });
    });
  });
});
