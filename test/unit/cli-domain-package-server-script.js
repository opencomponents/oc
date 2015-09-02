'use strict';

var expect = require('chai').expect;
var injectr = require('injectr');
var path = require('path');
var sinon = require('sinon');
var uglifyJs = require('uglify-js');
var _ = require('underscore');

var fsMock,
    packageServerScript,
    uglifySpy;

var initialise = function(fs, uglifyStub){

  uglifySpy = sinon.spy();
  fsMock = _.extend({
    existsSync: sinon.stub().returns(true),
    readFileSync: sinon.stub().returns('file content'),
    writeFile: sinon.stub().yields(null, 'ok')
  }, fs || {});

  packageServerScript = injectr('../../cli/domain/package-server-script.js', {
    'fs-extra': fsMock,
    'uglify-js': {
      minify: uglifyStub || function(code){
        uglifySpy();
        return { code: code };
      }
    },
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

        initialise({ readFileSync: sinon.stub().returns(serverjs) }, function(codeToMinify){
          return uglifyJs.minify(codeToMinify, {fromString: true});
        });

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
        expect(error).to.equal('Error while parsing myserver.js: SyntaxError: Unexpected token (3:19)');
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

      it('should minify the script', function(){
        expect(uglifySpy.called).to.be.true;
      });

      it('should save compiled data provider', function(){
        expect(fsMock.writeFile.args[0][1]).to.equal(serverjs);
      });

      it('should return hash for script', function(){
        expect(result.hashKey).not.be.empty;
      });
    });

    describe('when component requires a json', function(){

      var requiredJson = '{"hello":"world"}',
          serverjs = 'var data=require(\'./someJson\');module.exports.data=function(context,cb){return cb(null,data); };';

      beforeEach(function(done){
        
        var mocks = {
          readFileSync: sinon.stub()
        };

        mocks.readFileSync.onCall(0).returns(serverjs);
        mocks.readFileSync.onCall(1).returns(requiredJson);

        initialise(mocks);

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

      it('should save compiled and minified view-model handler incapsulating json content', function(){
        var written = fsMock.writeFile.args[0][1];

        expect(written).to.contain(serverjs);
        expect(written).to.contain(requiredJson);
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
        expect(error).to.equal('Missing dependencies from package.json => ["request"]');
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
        expect(error).to.equal('Requiring local js files is not allowed. Keep it small.');
      });
    });
  });
});
