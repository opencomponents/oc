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

  var requestMock = sinon.stub().yields(null, {});

  var Link = injectr('../../cli/domain/link.js', {
    'fs-extra': fsMock,
    '../../utils/request': requestMock
  });

  var local = new Link();

  return { local: local, fs: fsMock, request: requestMock };
};

var executeLink = function(local, callback){
  return local('my-component', '1.x.x', callback);
};

describe('cli : domain : link', function(){

  describe('when linking a component', function(){

    var error, result;
    beforeEach(function(done){

      var data = initialise();

      data.fs.readJson.onCall(0).yields(null, {
        registries: [ 'http://my-registry.com']
      });

      data.request.onCall(0).yields(null, JSON.stringify({
        type: 'oc-component'
      }));

      data.fs.writeJson.onCall(0).yields(null);

      executeLink(data.local, function(err, res){
        error = err;
        result = data.fs.writeJson.firstCall.args;
        done(err);
      });
    });

    it('should add linked component to config file', function(){
      expect(result[1].components).to.eql({ 'my-component': '1.x.x' });
    });
  });

  describe('when the component is already linked', function(){

    var error, result;
    beforeEach(function(done){

      var data = initialise();

      data.fs.readJson.onCall(0).yields(null, {
        registries: [ 'http://my-registry.com'],
        components: {
          'my-component': '1.x.x'
        }
      });

      executeLink(data.local, function(err, res){
        error = err;
        done();
      });
    });

    it('should return an error', function(){
      expect(error.toString()).to.eql('Error: Component already linked in the project');
    });
  });

  describe('when the component doesn\'t exist', function(){

    var error, result;
    beforeEach(function(done){

      var data = initialise();

      data.fs.readJson.onCall(0).yields(null, {
        registries: [ 'http://my-registry.com']
      });

      data.request.onCall(0).yields(new Error('component not found'));

      data.fs.writeJson.onCall(0).yields(null);

      executeLink(data.local, function(err, res){
        error = err;
        done();
      });
    });

    it('should return an error', function(){
      expect(error.toString()).to.eql('Error: Component not available');
    });
  });

  describe('when the registry is not configured', function(){

    var error, result;
    beforeEach(function(done){

      var data = initialise();

      data.fs.readJson.onCall(0).yields(null, {
        registries: []
      });

      executeLink(data.local, function(err, res){
        error = err;
        done();
      });
    });

    it('should return an error', function(){
      expect(error.toString()).to.eql('Error: Registry configuration not found. Add a registry reference to the project first');
    });
  });

  describe('when the oc.json is missing', function(){

    var error, result;
    beforeEach(function(done){

      var data = initialise();

      data.fs.readJson.onCall(0).yields(new Error('file not found'));

      executeLink(data.local, function(err, res){
        error = err;
        done();
      });
    });

    it('should return an error', function(){
      expect(error.toString()).to.eql('Error: file not found');
    });
  });
});
