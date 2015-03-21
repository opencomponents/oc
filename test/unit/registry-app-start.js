'use strict';

var expect = require('chai').expect;
var injectr = require('injectr');
var sinon = require('sinon');

var getAppStart = function(mockedRepository, options, callback){
  var appStart = injectr('../../registry/app-start.js', {
        '../package.json': { version: '1.2.3' }
      }, { console: { log: sinon.stub() }, __dirname: '.'});
      
  return appStart(mockedRepository, options, callback);
};

var basicOptions = {
  s3: {
    bucket: 'test',
    path: 'path',
    componentsDir: 'componentsDir'
  }
};

describe('registry : app-start', function(){

  describe('when registry starting', function(){

    describe('when not in local mode', function(){

      describe('when oc-client found on library', function(){

        it('should not publish it', function(done){

          var mockedRepository = {
            getComponentVersions: sinon.stub().yields(null, ['1.2.3']),
            publishComponent: sinon.spy()
          };

          getAppStart(mockedRepository, basicOptions, function(err, res){
            expect(mockedRepository.publishComponent.called).to.be.false;
            done();
          });
        });
      });

      describe('when oc-client not found on library', function(){

        it('should publish it', function(done){

          var mockedRepository = {
            getComponentVersions: sinon.stub().yields(null, ['1.0.0']),
            publishComponent: sinon.stub().yields(null, 'ok')
          };

          getAppStart(mockedRepository, basicOptions, function(err, res){
            expect(mockedRepository.publishComponent.called).to.be.true;
            done();
          });
        });
      });
    });
  });
});