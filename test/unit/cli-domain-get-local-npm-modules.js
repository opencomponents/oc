'use strict';

const expect = require('chai').expect;
const injectr = require('injectr');
const path = require('path');
const sinon = require('sinon');
const _ = require('lodash');

const initialise = function(){

  const fsMock = {
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

  const pathMock = {
    extname: path.extname,
    join: path.join,
    resolve: function(){
      return _.toArray(arguments).join('/');
    }
  };

  const GetLocalNpmModules = injectr('../../src/cli/domain/get-local-npm-modules.js', {
    'fs-extra': fsMock,
    path: pathMock
  }, { __dirname: '' });

  const local = new GetLocalNpmModules();

  return { local: local, fs: fsMock };
};

const executeGetLocalNpmModules = function(local){
  return local('.');
};

describe('cli : domain : get-local-npm-modules', () => {

  describe('when reading modules from dir', () => {

    let result;
    beforeEach(() => {

      const data = initialise();

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

    it('should return only the folders', () => {
      expect(result).to.eql(['a-module', 'another-module']);
    });
  });

  describe('when node_modules directory doesn\'t exist', () => {

    let result;
    beforeEach(() => {

      const data = initialise();

      data.fs.existsSync.onCall(0).returns(false);

      result = executeGetLocalNpmModules(data.local);
    });

    it('should return an empty array', () => {
      expect(result).to.eql([]);
    });
  });
});
