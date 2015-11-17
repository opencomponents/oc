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

  var Local = injectr('../../cli/domain/local.js', {
    'fs-extra': fsMock,
    path: pathMock,
    './package-static-files': sinon.stub().yields(null, 'ok'),
    './package-template': sinon.stub().yields(null, { type: 'jade', src: 'template.js', hashKey: '123456'})
  }, { __dirname: '' });

  var local = new Local({ logger: { log: console.log } });

  return { local: local, fs: fsMock };
};

describe('cli : domain : local', function(){


});
