'use strict';

const expect = require('chai').expect;
const injectr = require('injectr');
const sinon = require('sinon');
const _ = require('lodash');

describe('cli : domain : get-mocked-plugins', () => {
  const dynamicPluginModule = a => (a ? 'blarg' : 'flarg');
  const notAFunctionModule = { foo: 'bar' };
  const dynamicObjectPluginModule = {
    register: (opts, deps, next) => next(),
    execute: () => 'result'
  };

  const logMock = { err: _.noop, log: _.noop, ok: _.noop, warn: _.noop };
  let fsMock, getMockedPlugins;

  const initialise = function(fs, pathJoinStub) {
    fsMock = _.extend(
      {
        existsSync: sinon.stub().returns(true),
        readFileSync: sinon.stub().returns('file content'),
        readJsonSync: sinon.stub().returns({ content: true }),
        realpathSync: sinon.stub().returns('/root/'),
        writeFile: sinon.stub().yields(null, 'ok')
      },
      fs || {}
    );

    const fakePathFunc = function() {
      return _.toArray(arguments)
        .map(x => x.replace(/\.\//g, ''))
        .join('');
    };

    getMockedPlugins = injectr('../../src/cli/domain/get-mocked-plugins.js', {
      'fs-extra': fsMock,
      path: {
        join: pathJoinStub || fakePathFunc,
        resolve: fakePathFunc
      },
      '/root/components/dynamic-object-plugin.js': dynamicObjectPluginModule,
      '/root/components/dynamic-plugin.js': dynamicPluginModule,
      '/root/components/not-a-function.js': notAFunctionModule
    });
  };

  describe('when setting up mocked plugins', () => {
    describe('when componentsDir parameter is undefined', () => {
      const joinStub = sinon.stub();

      beforeEach(() => {
        initialise({}, joinStub);
        getMockedPlugins(logMock, undefined);
      });

      it('should use . as default', () => {
        expect(joinStub.args[0][0]).to.equal('.');
      });
    });

    describe('when componentsDir parameter is omitted', () => {
      const joinStub = sinon.stub();

      beforeEach(() => {
        initialise({}, joinStub);
        getMockedPlugins(logMock);
      });

      it('should use . as default', () => {
        expect(joinStub.args[0][0]).to.equal('.');
      });
    });

    describe('when oc.json is in both root and component folder', () => {
      let result;
      const ocJsonComponent = {
        registries: [],
        mocks: {
          plugins: {
            static: { foo: 1, bar: 2 }
          }
        }
      };

      const readMock = sinon.stub().returns(ocJsonComponent);

      beforeEach(() => {
        initialise({
          existsSync: sinon.stub().returns(true),
          readJsonSync: readMock
        });
        result = getMockedPlugins(logMock, '/root/components/');
      });

      it('should use components folder oc.json as default', () => {
        expect(readMock.calledOnce).to.be.true;
        expect(readMock.args[0][0]).to.equal('/root/components/oc.json');
        expect(result.length).to.equal(2);
      });
    });

    describe('when oc.json is in root folder', () => {
      let result;
      const ocJsonComponent = {
        registries: [],
        mocks: {
          plugins: {
            static: { foo: 1, bar: 2 }
          }
        }
      };
      const ocJsonRoot = {
        registries: [],
        mocks: {
          plugins: {
            static: { foo: 1, bar: 2, baz: 3 }
          }
        }
      };

      const readMock = sinon.stub(),
        existsMock = sinon.stub();

      readMock.withArgs('/root/components/oc.json').returns(ocJsonComponent);
      readMock.withArgs('/root/oc.json').returns(ocJsonRoot);

      existsMock.withArgs('/root/components/oc.json').returns(false);
      existsMock.withArgs('/root/oc.json').returns(true);

      beforeEach(() => {
        initialise({
          existsSync: existsMock,
          readJsonSync: readMock
        });
        result = getMockedPlugins(logMock, '/root/components/');
      });

      it('should use root oc.json', () => {
        expect(result.length).to.equal(3);
      });
    });

    describe('when oc.json is missing', () => {
      let result;
      beforeEach(() => {
        initialise({ existsSync: sinon.stub().returns(false) });
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
        mocks: {
          plugins: {}
        }
      };

      beforeEach(() => {
        initialise({
          existsSync: sinon.stub().returns(true),
          readJsonSync: sinon.stub().returns(ocJson)
        });
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
        mocks: {
          plugins: {
            static: {
              foo: 'bar'
            }
          }
        }
      };

      beforeEach(() => {
        initialise({
          existsSync: sinon.stub().returns(true),
          readJsonSync: sinon.stub().returns(ocJson)
        });
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
        mocks: {
          plugins: {
            dynamic: {
              foo: './dynamic-plugin.js'
            }
          }
        }
      };

      beforeEach(() => {
        initialise({
          existsSync: sinon.stub().returns(true),
          readJsonSync: sinon.stub().returns(ocJson)
        });
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
        mocks: {
          plugins: {
            dynamic: {
              myPlugin: './dynamic-object-plugin.js'
            }
          }
        }
      };

      beforeEach(() => {
        initialise({
          existsSync: sinon.stub().returns(true),
          readJsonSync: sinon.stub().returns(ocJson)
        });
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
        mocks: {
          plugins: {
            dynamic: {
              foo: './not-exist.js'
            }
          }
        }
      };

      const logger = { err: sinon.stub(), warn: () => {} };

      beforeEach(() => {
        initialise({
          existsSync: sinon.stub().returns(true),
          readJsonSync: sinon.stub().returns(ocJson)
        });
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
        mocks: {
          plugins: {
            dynamic: {
              foo: './not-a-function.js'
            }
          }
        }
      };

      const logger = { err: sinon.stub(), warn: () => {} };

      beforeEach(() => {
        initialise({
          existsSync: sinon.stub().returns(true),
          readJsonSync: sinon.stub().returns(ocJson)
        });
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
