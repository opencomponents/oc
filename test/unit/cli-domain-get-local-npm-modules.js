'use strict';

var expect = require('chai').expect;
var injectr = require('injectr');
var path = require('path');
var sinon = require('sinon');
var _ = require('underscore');

var initialise = function(){

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

  var GetLocalNpmModules = injectr('../../src/cli/domain/get-local-npm-modules.js', {
    'fs-extra': fsMock,
    path: pathMock
  }, { __dirname: '' });

  var local = new GetLocalNpmModules();

  return { local: local, fs: fsMock };
};

var executeGetLocalNpmModules = function(local){
  return local('.');
};

describe('cli : domain : get-local-npm-modules', function(){

  describe('when reading modules from dir', function(){

    var result;
    beforeEach(function(){

      var data = initialise();

      data.fs.readdirSync.onCall(0).returns([
        'a-module',
        'a-file.json',
        'another-module'
      ]);

      data.fs.existsSync.onCall(0).returns(true);

      data.fs.lstatSync.onCall(0).returns({ isDirectory: function(){ return true; }});
      data.fs.lstatSync.onCall(1).returns({ isDirectory: function(){ return false; }});
      data.fs.lstatSync.onCall(2).returns({ isDirectory: function(){ return true; }});

      result = executeGetLocalNpmModules(data.local);
    });

    it('should return only the folders', function(){
      expect(result).to.eql(['a-module', 'another-module']);
    });
  });

  describe('when node_modules directory doesn\'t exist', function(){

    var result;
    beforeEach(function(){

      var data = initialise();

      data.fs.existsSync.onCall(0).returns(false);

      result = executeGetLocalNpmModules(data.local);
    });

    it('should return an empty array', function(){
      expect(result).to.eql([]);
    });
  });
});
