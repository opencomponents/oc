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

  var GetComponentsByDir = injectr('../../src/cli/domain/get-components-by-dir.js', {
    'fs-extra': fsMock,
    path: pathMock
  }, { __dirname: '' });

  var local = new GetComponentsByDir();

  return { local: local, fs: fsMock };
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

      data.fs.existsSync.onCall(0).returns(true);
      data.fs.existsSync.onCall(1).returns(false);
      data.fs.existsSync.onCall(2).returns(false);
      data.fs.existsSync.onCall(3).returns(true);


      data.fs.readJsonSync.onCall(0).returns({ oc: {}});
      data.fs.readJsonSync.onCall(1).returns({ oc: { packaged: true }});

      executeComponentsListingByDir(data.local, function(err, res){
        error = err;
        result = res;
        done();
      });
    });

    it('should not error', function(){
      expect(error).to.be.null;
    });

    it('should get the correct list', function(){
      expect(result).to.eql(['./a-component']);
    });
  });

  describe('when reading a broken package.json', function(){

    var error, result;
    beforeEach(function(done){

      var data = initialise();

      data.fs.readdirSync.onCall(0).returns([
        'a-broken-component',
        'another-component'
      ]);

      data.fs.existsSync.onCall(0).returns(true);
      data.fs.existsSync.onCall(1).returns(true);

      data.fs.readJsonSync.onCall(0).throws(new Error('syntax error: fubar'));
      data.fs.readJsonSync.onCall(1).returns({ oc: { }});

      executeComponentsListingByDir(data.local, function(err, res){
        error = err;
        result = res;
        done();
      });
    });

    it('should not error', function(){
      expect(error).to.be.null;
    });

    it('should get the correct list', function(){
      expect(result).to.eql(['./another-component']);
    });
  });

  describe('when finds no components', function(){

    var error, result;
    beforeEach(function(done){

      var data = initialise();

      data.fs.readdirSync.onCall(0).returns([
        'a-broken-component',
        'not-a-component-dir',
        'file.json'
      ]);

      data.fs.existsSync.onCall(0).returns(true);
      data.fs.existsSync.onCall(1).returns(false);
      data.fs.existsSync.onCall(1).returns(false);

      data.fs.readJsonSync.onCall(0).throws(new Error('syntax error: fubar'));

      executeComponentsListingByDir(data.local, function(err, res){
        error = err;
        result = res;
        done();
      });
    });

    it('should not error', function(){
      expect(error).to.be.null;
    });

    it('should get an empty list', function(){
      expect(result).to.eql([]);
    });
  });
});
