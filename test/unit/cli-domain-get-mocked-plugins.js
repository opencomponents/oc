const expect = require('chai').expect;
const injectr = require('injectr');
const sinon = require('sinon');

const noop = () => {};

describe('cli : domain : get-mocked-plugins', () => {
  const dynamicPluginModule = (a) => (a ? 'blarg' : 'flarg');
  const notAFunctionModule = { foo: 'bar' };
  const dynamicObjectPluginModule = {
    register: (opts, deps, next) => next(),
    execute: () => 'result'
  };

  const logMock = { err: noop, log: noop, ok: noop, warn: noop };
  let fsMock;
  let getMockedPlugins;

  const initialise = ({fs = {}, pathJoin, getOcConfig}) => {
    fsMock = {
      existsSync: sinon.stub().returns(true),
      readFileSync: sinon.stub().returns('file content'),
      readJsonSync: sinon.stub().returns({ content: true }),
      realpathSync: sinon.stub().returns('/root/'),
      writeFile: sinon.stub().yields(null, 'ok'),
      ...fs
    };

    const fakePathFunc = (...args) =>
      args.map((x) => x.replace(/\.\//g, '')).join('');

    getMockedPlugins = injectr('../../dist/cli/domain/get-mocked-plugins.js', {
      'fs-extra': fsMock,
      'node:path': {
        join: pathJoin || fakePathFunc,
        resolve: fakePathFunc
      },
      './ocConfig': {
        getOcConfig: getOcConfig || sinon.stub().returns({
          registries: [],
          mocks: {
            plugins: {}
          }
        })
      },
      '/root/components/dynamic-object-plugin.js': dynamicObjectPluginModule,
      '/root/components/dynamic-plugin.js': dynamicPluginModule,
      '/root/components/not-a-function.js': notAFunctionModule
    }).default;
  };

  describe('when setting up mocked plugins', () => {
    describe('when componentsDir parameter is undefined', () => {
      let getOcConfigMock;

      beforeEach(() => {
        getOcConfigMock = sinon.stub().returns({ registries: [], mocks: { plugins: {} } });
        initialise({ getOcConfig: getOcConfigMock });
        getMockedPlugins(logMock, undefined);
      });

      it('should use . as default', () => {
        expect(getOcConfigMock.called).to.be.true;
        expect(getOcConfigMock.args[0][0]).to.equal('.');
      });
    });

    describe('when componentsDir parameter is omitted', () => {
      let getOcConfigMock;

      beforeEach(() => {
        getOcConfigMock = sinon.stub().returns({ registries: [], mocks: { plugins: {} } });
        initialise({ getOcConfig: getOcConfigMock });
        getMockedPlugins(logMock);
      });

      it('should use . as default', () => {
        expect(getOcConfigMock.called).to.be.true;
        expect(getOcConfigMock.args[0][0]).to.equal('.');
      });
    });

    describe('when oc.json is in both root and component folder', () => {
      let result;
      const ocJsonComponent = {
        registries: [],
        development: {
          plugins: {
            static: { foo: 1, bar: 2 }
          }
        }
      };

      const getOcConfigMock = sinon.stub().returns(ocJsonComponent);

      beforeEach(() => {
        initialise({ getOcConfig: getOcConfigMock });
        result = getMockedPlugins(logMock, '/root/components/');
      });

      it('should return plugins from the provided components folder config', () => {
        expect(getOcConfigMock.calledOnce).to.be.true;
        expect(getOcConfigMock.args[0][0]).to.equal('/root/components/');
        expect(result.length).to.equal(2);
      });
    });


    describe('when oc.json is missing', () => {
      let result;
      beforeEach(() => {
        const getOcConfigMock = sinon.stub().returns({
          registries: [],
          development: { plugins: {} }
        });
        initialise({ getOcConfig: getOcConfigMock });
        result = getMockedPlugins(logMock, '/root/components/');
      });

      it('should return an empty array', () => {
        expect(result.length).to.equal(0);
      });
    });

    describe('when no plugins are specified', () => {
      let result;
      const ocJson = {
        registries: [],
        development: {
          plugins: {}
        }
      };

      beforeEach(() => {
        initialise({ getOcConfig: sinon.stub().returns(ocJson) });
        result = getMockedPlugins(logMock, '/root/components/');
      });

      it('should return an empty array', () => {
        expect(result.length).to.equal(0);
      });
    });

    describe('when a static plugin is specified', () => {
      let result;
      const ocJson = {
        registries: [],
        development: {
          plugins: {
            static: {
              foo: 'bar'
            }
          }
        }
      };

      beforeEach(() => {
        initialise({fs:{
          existsSync: sinon.stub().returns(true),
        }, getOcConfig: sinon.stub().returns(ocJson)});
        result = getMockedPlugins(logMock, '/root/components/');
      });

      it('should return the static plugin', () => {
        expect(result.length).to.equal(1);
        expect(result[0].name).to.equal('foo');
      });

      it('should set up the execute method to return the specified value', () => {
        expect(result[0].register.execute()).to.equal('bar');
      });
    });

    describe('when a dynamic plugin with a function signature is specified', () => {
      let result;
      const ocJson = {
        registries: [],
        development: {
          plugins: {
            dynamic: {
              foo: './dynamic-plugin.js'
            }
          }
        }
      };

      beforeEach(() => {
        initialise({fs:{
          existsSync: sinon.stub().returns(true),
        }, getOcConfig: sinon.stub().returns(ocJson)});
        result = getMockedPlugins(logMock, '/root/components/');
      });

      it('should return the dynamic plugin', () => {
        expect(result.length).to.equal(1);
        expect(result[0].name).to.equal('foo');
      });

      it('should set up the execute method to run the module', () => {
        expect(result[0].register.execute(false)).to.equal('flarg');
        expect(result[0].register.execute(true)).to.equal('blarg');
      });
    });

    describe('when a dynamic plugin with an object signature is specified', () => {
      let result;
      const ocJson = {
        registries: [],
        development: {
          plugins: {
            dynamic: {
              myPlugin: './dynamic-object-plugin.js'
            }
          }
        }
      };

      beforeEach(() => {
        initialise({fs:{
          existsSync: sinon.stub().returns(true),
        }, getOcConfig: sinon.stub().returns(ocJson)});
        result = getMockedPlugins(logMock, '/root/components/');
      });

      it('should return the dynamic plugin', () => {
        expect(result.length).to.equal(1);
        expect(result[0].name).to.equal('myPlugin');
      });

      it('should set up the execute method to run the module', () => {
        expect(result[0].register.execute()).to.equal('result');
      });
    });

    describe('when a dynamic plugin is specified and the referenced file is missing', () => {
      let result;
      const ocJson = {
        registries: [],
        development: {
          plugins: {
            dynamic: {
              foo: './not-exist.js'
            }
          }
        }
      };

      const logger = { err: sinon.stub(), warn: () => {} };

      beforeEach(() => {
        initialise({fs:{
          existsSync: sinon.stub().returns(true),
        }, getOcConfig: sinon.stub().returns(ocJson)});
        result = getMockedPlugins(logger, '/root/components/');
      });

      it('should log an error', () => {
        expect(logger.err.args[0][0]).to.contain('Error: Cannot find module');
      });

      it('should omit the broken plugin from the results', () => {
        expect(result.length).to.equal(0);
      });
    });

    describe('when a dynamic plugin is specified and the module is not a function', () => {
      let result;
      const ocJson = {
        registries: [],
        development: {
          plugins: {
            dynamic: {
              foo: './not-a-function.js'
            }
          }
        }
      };

      const logger = { err: sinon.stub(), warn: () => {} };

      beforeEach(() => {
        initialise({fs:{
          existsSync: sinon.stub().returns(true),
        }, getOcConfig: sinon.stub().returns(ocJson)});
        result = getMockedPlugins(logger, '/root/components/');
      });

      it('should log an error', () => {
        expect(logger.err.args[0][0]).to.contain('foo () => Error (skipping)');
        expect(logger.err.args[1][0]).to.contain(
          'Looks like you are trying to register a dynamic mock plugin but the file you specified is not a valid mock'
        );
      });

      it('should omit the broken plugin from the results', () => {
        expect(result.length).to.equal(0);
      });
    });
  });
});
