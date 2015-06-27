'use strict';

var expect = require('chai').expect;

describe('registry : domain : plugins-initialiser', function(){

  var pluginsInitialiser = require('../../registry/domain/plugins-initialiser');

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
        expect(error).to.be.eql('Plugin 1 is not valid');
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
        expect(error).to.be.eql('Plugin 1 is not valid');
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
        expect(error).to.be.eql('Plugin 1 is not valid');
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
        expect(error).to.be.eql('Plugin 1 is not valid');
      });
    });
  });

  describe('when initialising valid plugins', function(){

    var passedOptions, flag, error, result;
    beforeEach(function(done){

      var plugins = [{
        name: 'getValue',
        register: {
          register: function(options, cb){
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
          register: function(options, cb){
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
});