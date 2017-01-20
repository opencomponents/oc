'use strict';

var expect = require('chai').expect;
var injectr = require('injectr');
var path = require('path');
var sinon = require('sinon');
var uglifyJs = require('uglify-js');
var _ = require('underscore');
var falafelLoader = require('falafel-loader');

var externalDependenciesHandlers =
  require('../../src/cli/domain/package-server-script/bundle/config/externalDependenciesHandlers');
var wrapLoops =
  require('../../src/cli/domain/package-server-script/bundle/config/wrapLoops');
var webpackConfigGenerator =
  require('../../src/cli/domain/package-server-script/bundle/config');


describe('cli : domain : package-server-script ', function(){

  describe('bundle/config/externalDependenciesHandlers when configured with a dependencies hash', function(){
    var handler = externalDependenciesHandlers({lodash: '4.17.14'});

    it('should return an array containing a function and a regular expression ', function(){
      expect(handler).to.be.an('array');
      expect(handler.length).to.be.equal(2);
      expect(handler[1] instanceof RegExp).to.be.true;
      expect(handler[0]).to.be.a('function');
    });

    describe('its regular expression', function(){
      var regex = handler[1];
      it('should match npm module names', function() {
        expect(regex.test('lodash')).to.be.true;
        expect(regex.test('lodash/fp/curryN')).to.be.true;
        expect(regex.test('@cycle/xstream-run')).to.be.true;
      });
      it('should not match local modules', function() {
        expect(regex.test('/myModule')).to.be.false;
        expect(regex.test('./myModule')).to.be.false;
      });
    });

    describe('its function', function() {
      var missingDephandler = handler[0];
      it('should return an error if a specific npm-module is missing from the given dependencies', function(done) {
        missingDephandler('_', 'underscore', function(err){
          expect(err.toString()).to.be.equal('Error: Missing dependencies from package.json => \"underscore\"');
          done();
        });
      });
      it('should invoke the callback with no arguments if module is not missing from the given dependencies', function(done) {
        missingDephandler('_', 'lodash', function(err){
          expect(err).to.be.an('undefined');
          return done();
        });
      });
    });
  });

  describe('bundle/config/wrapLoops', function (){

    it('should be a function with arity 1', function() {
      expect(wrapLoops).to.be.a('function');
      expect(wrapLoops.length).to.be.equal(1);
    });

    describe('when component code includes a loop', function(){
      var mockFalafel = function(){
        this.options = {
          falafel: wrapLoops
        };
        this.cacheable = function(){};
        this.loader = falafelLoader;
      };
      var falafel = new mockFalafel();

      var serverjs = 'module.exports.data=function(context,cb){ var x,y,z;'
        + 'while(true){ x = 234; } '
        + 'for(var i=1e12;;){ y = 546; }'
        + 'do { z = 342; } while(true);'
        + 'return cb(null,data); };';

      var result = falafel.loader(serverjs);

      it('should wrap the while loop with an iterator limit', function() {
        expect(result).to.contain('var x,y,z;var __ITER = 1000000000;while(true){ if(__ITER <=0)'
          + '{ throw new Error("Loop exceeded maximum allowed iterations"); }  x = 234;  __ITER--; }');
      });

      it('should wrap the for loop with an iterator limit', function(){
        expect(result).to.contain('for(var i=1e12;;){ if(__ITER <=0)'
          + '{ throw new Error("Loop exceeded maximum allowed iterations"); }  y = 546;  __ITER--; }');
      });

      it('should wrap the do loop with an iterator limit (and convert it to a for loop)', function(){
        expect(result).to.contain('var __ITER = 1000000000;do { if(__ITER <=0)'
          + '{ throw new Error("Loop exceeded maximum allowed iterations"); }  z = 342;  __ITER--; } while(true)');
      });
    });
  });

  describe('bundle/config', function(){

    describe('when configured', function(){
       var config = webpackConfigGenerator({
        webpack: { stats: 'none' },
        dependencies: {},
        fileName: 'server.js',
        dataPath: '/path/to/server.js'
      });

      it('should return a proper configuration options for webpack', function(){
        expect(config.entry).to.be.equal('/path/to/server.js');
        expect(config.output.filename).to.be.equal('server.js');
        expect(config.externals).to.be.an('array');
      });
    });
  });
});
