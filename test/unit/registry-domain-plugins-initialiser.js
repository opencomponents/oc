'use strict';

var expect = require('chai').expect;

describe('registry : domain : plugins-initialiser', function(){

  var pluginsInitialiser = require('../../src/registry/domain/plugins-initialiser');

  describe('when initialising not valid plugins', function(){

    describe('when plugin not registered correctly', function(){

      var result, error;
      beforeEach(function(done){

        var plugins = [{
          name: 'doSomething'
        }];

        pluginsInitialiser.init(plugins, function(err, res){
          error = err;
          result = res;
          done();
        });
      });

      it('should error', function(){
        expect(error.toString()).to.be.eql('Error: Plugin doSomething is not valid');
      });
    });

    describe('when plugin is anonymous', function(){

      var result, error;
      beforeEach(function(done){

        var plugins = [{
          register: {
            register: function(){},
            execute: function(){}
          }
        }];

        pluginsInitialiser.init(plugins, function(err, res){
          error = err;
          result = res;
          done();
        });
      });

      it('should error', function(){
        expect(error.toString()).to.be.eql('Error: Plugin 1 is not valid');
      });
    });

    describe('when plugin does not expose a register method', function(){

      var result, error;
      beforeEach(function(done){

        var plugins = [{
          name: 'doSomething',
          register: { execute: function(){}}
        }];

        pluginsInitialiser.init(plugins, function(err, res){
          error = err;
          result = res;
          done();
        });
      });

      it('should error', function(){
        expect(error.toString()).to.be.eql('Error: Plugin doSomething is not valid');
      });
    });

    describe('when plugin does not expose an execute method', function(){

      var result, error;
      beforeEach(function(done){

        var plugins = [{
          name: 'doSomething',
          register: { register: function(){}}
        }];

        pluginsInitialiser.init(plugins, function(err, res){
          error = err;
          result = res;
          done();
        });
      });

      it('should error', function(){
        expect(error.toString()).to.be.eql('Error: Plugin doSomething is not valid');
      });
    });
  });

  describe('when initialising valid plugins', function(){

    var passedOptions, flag, error, result;
    beforeEach(function(done){

      var plugins = [{
        name: 'getValue',
        register: {
          register: function(options, deps, cb){
            passedOptions = options;
            cb();
          },
          execute: function(key){
            return passedOptions[key];
          }
        },
        options: {
          a: 123,
          b: 456
        }
      },
      {
        name: 'isFlagged',
        register: {
          register: function(options, deps, cb){
            flag = true;
            cb();
          },
          execute: function(){
            return flag;
          }
        }
      }];

      pluginsInitialiser.init(plugins, function(err, res){
        error = err;
        result = res;
        done();
      });
    });

    it('should register plugin with passed options', function(){
      expect(passedOptions).to.eql({a: 123, b: 456});
    });

    it('should expose the functionalities using the plugin names', function(){
      expect(result.getValue).to.be.a('function');
      expect(result.isFlagged).to.be.a('function');
    });

    it('should be make the functionality usable', function(){
      var a = result.getValue('a'),
          flagged = result.isFlagged();

      expect(a).to.equal(123);
      expect(flagged).to.equal(true);
    });
  });

  describe('when plugin specifies dependencies', function(){

    var passedDeps, flag, error, result;
    beforeEach(function(done){

      var plugins = [{
        name: 'isFlagged',
        register: {
          register: function(options, deps, cb){
            flag = true;
            cb();
          },
          execute: function(){
            return flag;
          }
        }
      },
      {
        name: 'getValue',
        register: {
          register: function(options, deps, cb){
            passedDeps = deps;
            cb();
          },
          execute: function(){},
          dependencies: ['isFlagged']
        },
        options: {}
      }];

      pluginsInitialiser.init(plugins, function(err, res){
        error = err;
        result = res;
        done();
      });
    });

    it('should provide the getValue register method with the required dependent plugins', function(){
      expect(passedDeps.isFlagged()).to.eql(true);
    });
  });

  describe('when plugins have a circular dependency', function(){

    var passedDeps, flag, error, result;
    beforeEach(function(done){

      var plugins = [{
        name: 'getValue',
        register: {
          register: function(options, deps, cb){
            passedDeps = deps;
            cb();
          },
          execute: function(){},
          dependencies: ['isFlagged']
        },
        options: {}
      },
      {
        name: 'isFlagged',
        register: {
          register: function(options, deps, cb){
            flag = true;
            cb();
          },
          execute: function(){
            return flag;
          },
          dependencies: ['getValue']
        }
      }];

      pluginsInitialiser.init(plugins, function(err, res){
        error = err;
        result = res;
        done();
      });
    });

    it('should throw an error', function(){
      expect(error.toString()).to.eql('Error: Dependency Cycle Found: getValue -> isFlagged -> getValue');
    });
  });

  describe('when plugin depends on a plugin that is not registered', function(){

    var passedDeps, error, result;
    beforeEach(function(done){

      var plugins = [{
        name: 'getValue',
        register: {
          register: function(options, deps, cb){
            passedDeps = deps;
            cb();
          },
          execute: function(){},
          dependencies: ['isFlagged']
        },
        options: {}
      }];

      pluginsInitialiser.init(plugins, function(err, res){
        error = err;
        result = res;
        done();
      });
    });

    it('should throw an error', function(){
      expect(error.toString()).to.eql('Error: unknown plugin dependency: isFlagged');
    });
  });

  describe('when plugin chain requires multiple passes', function(){

    var passedDeps, flag, error, result;
    beforeEach(function(done){

      var plugins = [{
        name: 'doSomething',
        register: {
          register: function(options, deps, cb){
            cb();
          },
          execute: function(){ return true; },
          dependencies: ['getValue']
        },
        options: {}
      },
      {
        name: 'getValue',
        register: {
          register: function(options, deps, cb){
            passedDeps = deps;
            cb();
          },
          execute: function(){},
          dependencies: ['isFlagged']
        },
        options: {}
      },
      {
        name: 'isFlagged',
        register: {
          register: function(options, deps, cb){
            flag = true;
            cb();
          },
          execute: function(){
            return flag;
          }
        }
      }];

      pluginsInitialiser.init(plugins, function(err, res){
        error = err;
        result = res;
        done();
      });
    });

    it('should defer the initalisation of the plugin until all dependencies have bee registered', function(){
      expect(result.doSomething()).to.eql(true);
    });
  });
});
