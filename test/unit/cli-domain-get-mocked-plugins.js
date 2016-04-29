'use strict';

var expect = require('chai').expect;
var injectr = require('injectr');
var path = require('path');
var sinon = require('sinon');
var _ = require('underscore');
var dynamicPluginModule = function(a){ return a ? 'blarg' : 'flarg'; };
var notAFunctionModule = { 'foo' : 'bar' };

var fsMock,
    getMockedPlugins;

var initialise = function(fs){

  fsMock = _.extend({
    existsSync: sinon.stub().returns(true),
    readFileSync: sinon.stub().returns('file content'),
    readJsonSync: sinon.stub().returns({ content: true }),
    writeFile: sinon.stub().yields(null, 'ok')
  }, fs || {});

  getMockedPlugins = injectr('../../src/cli/domain/get-mocked-plugins.js', {
    'fs-extra': fsMock,
    path: {
      resolve: function(){
        return _.toArray(arguments).join('/');
      }
    },
    './dynamic-plugin.js': dynamicPluginModule,
    './not-a-function.js': notAFunctionModule
  });
};

describe('cli : domain : get-mocked-plugins', function(){

  describe('when setting up mocked plugins', function(){

    describe('when oc.json is missing', function(){
      var result;
      beforeEach(function(){
        initialise({ existsSync: sinon.stub().returns(false) });
        result = getMockedPlugins(console);
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
        result = getMockedPlugins({log: sinon.stub()});
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
        result = getMockedPlugins({log: sinon.stub()});
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
        result = getMockedPlugins({ log: sinon.stub() });
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

      var logger = { log: sinon.stub() };

      beforeEach(function(){
        initialise({
            existsSync: sinon.stub().returns(true),
            readJsonSync: sinon.stub().returns(ocJson)
         });
        result = getMockedPlugins(logger);
      });

      it('should log an error', function(){
        expect(logger.log.secondCall.args[0]).to.contain(
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

      var logger = { log: sinon.stub() };

      beforeEach(function(){
        initialise({
            existsSync: sinon.stub().returns(true),
            readJsonSync: sinon.stub().returns(ocJson)
         });
        result = getMockedPlugins(logger);
      });

      it('should log an error', function(){
        expect(logger.log.secondCall.args[0]).to.contain(
          'Looks like you are trying to register a dynamic mock plugin but the file you specified is not a function');
      });

      it('should omit the broken plugin from the results', function(){
        expect(result.length).to.equal(0);
      });
    });
  });
});
