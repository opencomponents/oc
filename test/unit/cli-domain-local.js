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

var executeMocking = function(local, type, name, value, cb){
  return local.mock({
    targetType: type,
    targetName: name,
    targetValue: value
  }, cb);
};

describe('cli : domain : local', function(){

  describe('when mocking a static plugin', function(){

    var data;
    beforeEach(function(done){
      data = initialise();

      data.fs.readJson.yields(null, { something: 'hello' });
      data.fs.writeJson.yields(null, 'ok');

      executeMocking(data.local, 'plugin', 'getValue', 'value', done);
    });

    it('should add mock to oc.json', function(){
      expect(data.fs.writeJson.called).to.be.true;
      expect(data.fs.writeJson.args[0][1]).to.eql({
        something: 'hello',
        mocks: {
          plugins: {
            static: {
              getValue: 'value'
            }
          }
        }
      });
    });
  });

  describe('when mocking a dynamic plugin', function(){

    var data;
    beforeEach(function(done){
      data = initialise();

      data.fs.readJson.yields(null, { something: 'hello' });
      data.fs.existsSync.returns(true);
      data.fs.writeJson.yields(null, 'ok');

      executeMocking(data.local, 'plugin', 'getValue', './value.js', done);
    });

    it('should add mock to oc.json', function(){
      expect(data.fs.writeJson.called).to.be.true;
      expect(data.fs.writeJson.args[0][1]).to.eql({
        something: 'hello',
        mocks: {
          plugins: {
            dynamic: {
              getValue: './value.js'
            }
          }
        }
      });
    });
  });
});
