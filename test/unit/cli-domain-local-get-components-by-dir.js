'use strict';

var expect = require('chai').expect;
var injectr = require('injectr');
var path = require('path');
var sinon = require('sinon');
var _ = require('underscore');

var initialise = function(){

  var loggerMock = {
    log: sinon.stub()
  };

  var fsMock = {
    existsSync: sinon.stub(),
    lstatSync: sinon.stub(),
    mkdirSync: sinon.spy(),
    readdirSync: sinon.stub(),
    readFileSync: sinon.stub(),
    readJson: sinon.stub(),
    readJsonSync: sinon.stub(),
    writeFile: sinon.stub().yields(null, 'ok'),
    writeJson: sinon.stub().yields(null, 'ok')
  };

  var pathMock = {
    extname: path.extname,
    join: path.join,
    resolve: function(){
      return _.toArray(arguments).join('/');
    }
  };

  var GetComponentsByDir = injectr('../../cli/domain/get-components-by-dir.js', {
    'fs-extra': fsMock,
    path: pathMock
  }, { __dirname: '' });

  var local = new GetComponentsByDir({ logger: loggerMock });

  return { local: local, fs: fsMock, logger: loggerMock };
};

var executeComponentsListingByDir = function(local, callback){
  return local('.', callback);
};

describe('cli : domain : get-components-by-dir', function(){

  describe('when getting components from dir', function(){

    var error, result;
    beforeEach(function(done){

      var data = initialise();

      data.fs.readdirSync.onCall(0).returns([
        'a-component',
        'a-not-component-dir',
        'a-file.json',
        '_package'
      ]);

      data.fs.lstatSync.onCall(0).returns({ isDirectory: function(){ return true; }});
      data.fs.existsSync.onCall(0).returns(true);
      data.fs.readJsonSync.onCall(0).returns({ oc: {}});

      data.fs.lstatSync.onCall(1).returns({ isDirectory: function(){ return true; }});
      data.fs.existsSync.onCall(1).returns(false);

      data.fs.lstatSync.onCall(2).returns({ isDirectory: function(){ return false; }});

      data.fs.lstatSync.onCall(3).returns({ isDirectory: function(){ return true; }});
      data.fs.existsSync.onCall(2).returns(true);
      data.fs.readJsonSync.onCall(1).returns({ oc: { packaged: true }});

      executeComponentsListingByDir(data.local, function(err, res){
        error = err;
        result = res;
        done();
      });
    });

    it('should add version to package.json file', function(){
      expect(result).to.eql(['./a-component']);
    });
  });

  describe('when reading a broken package.json', function(){

    var error, result, logger;
    beforeEach(function(done){

      var data = initialise();

      data.fs.readdirSync.onCall(0).returns([
        'a-broken-component',
        'another-component'
      ]);

      data.fs.lstatSync.onCall(0).returns({ isDirectory: function(){ return true; }});
      data.fs.existsSync.onCall(0).returns(true);
      data.fs.readJsonSync.onCall(0).throws(new Error('syntax error: fubar'));

      data.fs.lstatSync.onCall(1).returns({ isDirectory: function(){ return true; }});
      data.fs.existsSync.onCall(1).returns(true);
      data.fs.readJsonSync.onCall(1).returns({ oc: { }});

      executeComponentsListingByDir(data.local, function(err, res){
        error = err;
        result = res;
        logger = data.logger;
        done();
      });
    });

    it('should handle the error and continue loading other components', function(){
      expect(result).to.eql(['./another-component']);
    });

    it('should log the error', function(){
      expect(logger.log.called).to.eql(true);
    });
  });
});
