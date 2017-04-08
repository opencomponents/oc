'use strict';

var expect = require('chai').expect;
var injectr = require('injectr');
var sinon = require('sinon');
var _ = require('underscore');

describe('cli : domain : get-mocked-plugins', function(){

  var dynamicPluginModule = function(a){ return a ? 'blarg' : 'flarg'; },
      notAFunctionModule = { 'foo' : 'bar' },
      fsMock,
      getMockedPlugins;

  var initialise = function(fs, pathJoinStub){

    fsMock = _.extend({
      existsSync: sinon.stub().returns(true),
      readFileSync: sinon.stub().returns('file content'),
      readJsonSync: sinon.stub().returns({ content: true }),
      realpathSync: sinon.stub().returns('/root/'),
      writeFile: sinon.stub().yields(null, 'ok')
    }, fs || {});

    var fakePathFunc = function(){
      return _.toArray(arguments)
              .map(function(x){
                return x.replace(/\.\//g, '');
              })
              .join('');
    };

    getMockedPlugins = injectr('../../src/cli/domain/get-mocked-plugins.js', {
      'fs-extra': fsMock,
      path: {
        join: pathJoinStub || fakePathFunc,
        resolve: fakePathFunc
      },
      '/root/components/dynamic-plugin.js': dynamicPluginModule,
      '/root/components/not-a-function.js': notAFunctionModule
    });
  };

  describe('when setting up mocked plugins', function(){

    describe('when componentsDir parameter is undefined', function(){

      var joinStub = sinon.stub();

      beforeEach(function(){
        initialise({}, joinStub);
        getMockedPlugins({ log: _.noop }, undefined);
      });

      it('should use . as default', function(){
        expect(joinStub.args[0][0]).to.equal('.');
      });
    });

    describe('when componentsDir parameter is omitted', function(){

      var joinStub = sinon.stub();

      beforeEach(function(){
        initialise({}, joinStub);
        getMockedPlugins({ log: _.noop });
      });

      it('should use . as default', function(){
        expect(joinStub.args[0][0]).to.equal('.');
      });
    });

    describe('when oc.json is in both root and component folder', function(){

      var result;
      var ocJsonComponent = {
        registries: [],
        mocks: {
          plugins: {
            static: { foo: 1, bar: 2 }
          }
        }
      };

      var readMock = sinon.stub().returns(ocJsonComponent);

      beforeEach(function(){
        initialise({
          existsSync: sinon.stub().returns(true),
          readJsonSync: readMock
        });
        result = getMockedPlugins({ log: () => {}, warn: () => {} }, '/root/components/');
      });

      it('should use components folder oc.json as default', function(){
        expect(readMock.calledOnce).to.be.true;
        expect(readMock.args[0][0]).to.equal('/root/components/oc.json');
        expect(result.length).to.equal(2);
      });
    });

    describe('when oc.json is in root folder', function(){

      var result;
      var ocJsonComponent = {
        registries: [],
        mocks: {
          plugins: {
            static: { foo: 1, bar: 2 }
          }
        }
      };
      var ocJsonRoot = {
        registries: [],
        mocks: {
          plugins: {
            static: { foo: 1, bar: 2, baz: 3 }
          }
        }
      };

      var readMock = sinon.stub(),
          existsMock = sinon.stub();
      
      readMock.withArgs('/root/components/oc.json').returns(ocJsonComponent);
      readMock.withArgs('/root/oc.json').returns(ocJsonRoot);

      existsMock.withArgs('/root/components/oc.json').returns(false);
      existsMock.withArgs('/root/oc.json').returns(true);

      beforeEach(function(){
        initialise({
          existsSync: existsMock,
          readJsonSync: readMock
        });
        result = getMockedPlugins({ log: () => {}, warn: () => {} }, '/root/components/');
      });

      it('should use root oc.json', function(){
        expect(result.length).to.equal(3);
      });
    });

    describe('when oc.json is missing', function(){
      var result;
      beforeEach(function(){
        initialise({ existsSync: sinon.stub().returns(false) });
        result = getMockedPlugins(console, '/root/components/');
      });

      it('should return an empty array', function(){
        expect(result.length).to.equal(0);
      });
    });

    describe('when no plugins are specified', function(){
      var result;
      var ocJson = {
        registries: [],
        mocks: {
          plugins: {}
        }
      };

      beforeEach(function(){
        initialise({
            existsSync: sinon.stub().returns(true),
            readJsonSync: sinon.stub().returns(ocJson)
         });
        result = getMockedPlugins({ warn: sinon.stub() }, '/root/components/');
      });

      it('should return an empty array', function(){
        expect(result.length).to.equal(0);
      });
    });

    describe('when a static plugin is specified', function(){
      var result;
      var ocJson = {
        registries: [],
        mocks: {
          plugins: {
            static: {
              foo: 'bar'
            }
          }
        }
      };

      beforeEach(function(){
        initialise({
            existsSync: sinon.stub().returns(true),
            readJsonSync: sinon.stub().returns(ocJson)
         });
        result = getMockedPlugins({ log: () => {}, warn: () => {} }, '/root/components/');
      });

      it('should return the static plugin', function(){
        expect(result.length).to.equal(1);
        expect(result[0].name).to.equal('foo');
      });

      it('should set up the execute method to return the specified value', function(){
        expect(result[0].register.execute()).to.equal('bar');
      });
    });

    describe('when a dynamic plugin is specified', function(){
      var result;
      var ocJson = {
        registries: [],
        mocks: {
          plugins: {
            dynamic: {
              foo: './dynamic-plugin.js'
            }
          }
        }
      };

      beforeEach(function(){
        initialise({
            existsSync: sinon.stub().returns(true),
            readJsonSync: sinon.stub().returns(ocJson)
         });
        result = getMockedPlugins({ log: () => {}, warn: () => {} }, '/root/components/');
      });

      it('should return the dynamic plugin', function(){
        expect(result.length).to.equal(1);
        expect(result[0].name).to.equal('foo');
      });

      it('should set up the execute method to run the module', function(){
        expect(result[0].register.execute(false)).to.equal('flarg');
        expect(result[0].register.execute(true)).to.equal('blarg');
      });
    });

    describe('when a dynamic plugin is specified and the referenced file is missing', function(){
      var result;
      var ocJson = {
        registries: [],
        mocks: {
          plugins: {
            dynamic: {
              foo: './not-exist.js'
            }
          }
        }
      };

      var logger = { err: sinon.stub(), warn: () => {} };

      beforeEach(function(){
        initialise({
            existsSync: sinon.stub().returns(true),
            readJsonSync: sinon.stub().returns(ocJson)
         });
        result = getMockedPlugins(logger, '/root/components/');
      });

      it('should log an error', function(){
        expect(logger.err.args[0][0]).to.contain(
          'Error: Cannot find module');
      });

      it('should omit the broken plugin from the results', function(){
        expect(result.length).to.equal(0);
      });
    });

    describe('when a dynamic plugin is specified and the module is not a function', function(){
      var result;
      var ocJson = {
        registries: [],
        mocks: {
          plugins: {
            dynamic: {
              foo: './not-a-function.js'
            }
          }
        }
      };

      var logger = { err: sinon.stub(), warn: () => {} };

      beforeEach(function(){
        initialise({
            existsSync: sinon.stub().returns(true),
            readJsonSync: sinon.stub().returns(ocJson)
         });
        result = getMockedPlugins(logger, '/root/components/');
      });

      it('should log an error', function(){
        expect(logger.err.args[0][0]).to.contain(
          'Looks like you are trying to register a dynamic mock plugin but the file you specified is not a function');
      });

      it('should omit the broken plugin from the results', function(){
        expect(result.length).to.equal(0);
      });
    });
  });
});
