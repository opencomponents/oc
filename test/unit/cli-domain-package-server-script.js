'use strict';

var expect = require('chai').expect;
var injectr = require('injectr');
var path = require('path');
var sinon = require('sinon');
var uglifyJs = require('uglify-js');
var _ = require('underscore');

var fsMock,
    packageServerScript;

var initialise = function(fs){

  fsMock = _.extend({
    existsSync: sinon.stub().returns(true),
    readFileSync: sinon.stub().returns('file content'),
    readJsonSync: sinon.stub().returns({ content: true }),
    writeFile: sinon.stub().yields(null, 'ok')
  }, fs || {});

  packageServerScript = injectr('../../src/cli/domain/package-server-script.js', {
    'fs-extra': fsMock,
    path: {
      extname: path.extname,
      join: path.join,
      resolve: function(){
        return _.toArray(arguments).join('/');
      }
    }
  });
};

describe('cli : domain : package-server-script', function(){

  describe('when packaging component\'s server.js', function(){

    describe('when component implements not-valid javascript', function(){

      var error,
          serverjs = 'var data=require(\'request\');\nmodule.exports.data=function(context,cb){\nreturn cb(null,data; };';

      beforeEach(function(done){

        initialise({ readFileSync: sinon.stub().returns(serverjs) });

        packageServerScript({
          componentPath: '/path/to/component/',
          ocOptions: {
            files: {
              data: 'myserver.js'
            }
          },
          publishPath: '/path/to/component/_package/'
        }, function(e, r){
          error = e;
          done();
        });
      });

      it('should throw an error with error details', function(){
        expect(error.toString()).to.equal('Error: Javascript error found in myserver.js [3,19]: Unexpected token punc «;», expected punc «,»]');
      });
    });

    describe('when component does not require any json', function(){

      var result,
          serverjs = 'module.exports.data=function(context,cb){return cb(null, {name:\'John\'}); };';

      beforeEach(function(done){

        initialise({ readFileSync: sinon.stub().returns(serverjs) });

        packageServerScript({
          componentPath: '/path/to/component/',
          ocOptions: {
            files: {
              data: 'server.js'
            }
          },
          publishPath: '/path/to/component/_package/'
        }, function(e, r){
          result = r;
          done();
        });
      });

      it('should save compiled data provider', function(){
        expect(fsMock.writeFile.args[0][1]).to.equal('module.exports.data=function(n,e){return e(null,{name:"John"})};');
      });

      it('should return hash for script', function(){
        expect(result.hashKey).not.be.empty;
      });
    });

    describe('when component requires a json', function(){

      var requiredJson = { hello: 'world' },
          serverjs = 'var data = require(\'./someJson\'); module.exports.data=function(context,cb){return cb(null,{}); };';

      beforeEach(function(done){

        initialise({
          readFileSync: sinon.stub().returns(serverjs),
          readJsonSync: sinon.stub().returns(requiredJson)
        });

        packageServerScript({
          componentPath: '/path/to/component/',
          ocOptions: {
            files: {
              data: 'server.js'
            }
          },
          publishPath: '/path/to/component/_package/'
        }, done);
      });

      it('should save compiled and minified data provider encapsulating json content', function(){
        var written = fsMock.writeFile.args[0][1];

        expect(written).to.contain('var __sandboxedRequire=require,__localRequires={"./someJson":{hello:"world"}};'
          + 'require=function(e){return __localRequires[e]?__localRequires[e]:__sandboxedRequire(e)};var data=require("./someJson");'
          + 'module.exports.data=function(e,r){return r(null,{})};');
      });
    });

    describe('when component requires a module', function(){

      var error,
          serverjs = 'var data=require(\'request\');module.exports.data=function(context,cb){return cb(null,data); };';

      beforeEach(function(done){

        initialise({ readFileSync: sinon.stub().returns(serverjs) });

        packageServerScript({
          componentPath: '/path/to/component/',
          ocOptions: {
            files: {
              data: 'server.js'
            }
          },
          publishPath: '/path/to/component/_package/'
        }, function(e, r){
          error = e;
          done();
        });
      });

      it('should throw an error when the dependency is not present in the package.json', function(){
        expect(error.toString()).to.equal('Error: Missing dependencies from package.json => ["request"]');
      });
    });

    describe('when component requires a js file', function(){

      var serverjs = 'var data=require(\'./hi.js\');module.exports.data=function(context,cb){return cb(null,data); };',
          error;

      beforeEach(function(done){

        initialise({ readFileSync: sinon.stub().returns(serverjs) });

        packageServerScript({
          componentPath: '/path/to/component/',
          ocOptions: {
            files: {
              data: 'server.js'
            }
          },
          publishPath: '/path/to/component/_package/'
        }, function(e, r){
          error = e;
          done();
        });
      });

      it('should not package component and respond with error', function(){
        expect(error.toString()).to.equal('Error: Requiring local js files is not allowed. Keep it small.');
      });
    });

    describe('when component requires a file without extension that is not found as json', function(){

      var serverjs = 'var data=require(\'./hi\');module.exports.data=function(context,cb){return cb(null,data); };',
          error;

      beforeEach(function(done){

        initialise({
          readFileSync: sinon.stub().returns(serverjs),
          existsSync: sinon.stub().returns(false)
        });

        packageServerScript({
          componentPath: '/path/to/component/',
          ocOptions: {
            files: {
              data: 'server.js'
            }
          },
          publishPath: '/path/to/component/_package/'
        }, function(e, r){
          error = e;
          done();
        });
      });

      it('should not package component and respond with error', function(){
        expect(error.toString()).to.equal('Error: ./hi.json not found. Only json files are require-able.');
      });
    });

    describe('when component code includes a loop', function(){

      var serverjs = 'module.exports.data=function(context,cb){ var x,y,z;'
          + 'while(true){ x = 234; } '
          + 'for(var i=1e12;;){ y = 546; }'
          + 'do { z = 342; } while(true);'
          + 'return cb(null,data); };',
          result;

      beforeEach(function(done){

        initialise({
          readFileSync: sinon.stub().returns(serverjs),
          existsSync: sinon.stub().returns(false)
        });

        packageServerScript({
          componentPath: '/path/to/component/',
          ocOptions: {
            files: {
              data: 'server.js'
            }
          },
          publishPath: '/path/to/component/_package/'
        }, function(e, r){
          result = r;
          done();
        });
      });

      it('should wrap the while loop with an iterator limit (and convert it to a for loop)', function(){
        expect(fsMock.writeFile.firstCall.args[1]).to.contain('for(var r,a,t,i=1e9;;){if(0>=i)throw new Error(\"loop exceeded maximum allowed iterations\");r=234,i--}');
      });

      it('should wrap the for loop with an iterator limit', function(){
        expect(fsMock.writeFile.firstCall.args[1]).to.contain('for(var i=1e9;;){if(0>=i)throw new Error(\"loop exceeded maximum allowed iterations\");a=546,i--}');
      });

      it('should wrap the do loop with an iterator limit (and convert it to a for loop)', function(){
        expect(fsMock.writeFile.firstCall.args[1]).to.contain('for(var i=1e9;;){if(0>=i)throw new Error(\"loop exceeded maximum allowed iterations\");t=342,i--}');
      });
    });
  });
});
