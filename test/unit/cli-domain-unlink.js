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

  var Unlink = injectr('../../cli/domain/unlink.js', {
    'fs-extra': fsMock
  });

  var local = new Unlink();

  return { local: local, fs: fsMock };
};

var executeUnlink = function(local, callback){
  return local('my-component', callback);
};

describe('cli : domain : link', function(){

  describe('when unlinking a component', function(){

    var error, result;
    beforeEach(function(done){

      var data = initialise();

      data.fs.readJson.onCall(0).yields(null, {
        registries: [ 'http://my-registry.com'],
        components: {
          'my-component': '1.x.x'
        }
      });

      data.fs.writeJson.onCall(0).yields(null);

      executeUnlink(data.local, function(err, res){
        error = err;
        result = data.fs.writeJson.firstCall.args;
        done(err);
      });
    });

    it('should remove linked component from config file', function(){
      expect(result[1].components).to.eql({});
    });
  });
});
