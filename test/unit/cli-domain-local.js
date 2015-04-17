'use strict';

var expect = require('chai').expect;
var injectr = require('injectr');
var sinon = require('sinon');

describe('cli : domain : local', function(){

  describe('when packaging', function(){

    var readJsonSyncStub = sinon.stub(),
        readFileSyncStub = sinon.stub(),
        existsSyncStub = sinon.stub();

    var fsMock = {
      readdirSync: sinon.spy(),
      mkdirSync: sinon.spy(),
      readJsonSync: readJsonSyncStub,
      readFileSync: readFileSyncStub,
      existsSync: existsSyncStub,
      writeFileSync: sinon.spy(),
      writeJsonSync: sinon.spy()
    };

    var mockComponent = {
      name: 'helloworld',
      oc: {
        files: {
          template: {
            type: 'jade',
            src: ''
          }
        }
      }
    };

    existsSyncStub.returns(true);
    readJsonSyncStub.onCall(0).returns(mockComponent);
    readJsonSyncStub.onCall(1).returns({
      version: '1.2.3'
    });

    readFileSyncStub.returns('');
    var Local = injectr('../../cli/domain/local.js', { 'fs-extra' : fsMock }, { __dirname: '' });

    it('should add version to package.json file', function(done){
      var local = new Local();
      local.package('.', function(err, res){
        expect(mockComponent.oc.version).to.eql('1.2.3');
        done();
      });
    });
  });
});