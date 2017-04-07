'use strict';

const expect = require('chai').expect;
const injectr = require('injectr');
const sinon = require('sinon');

const getAppStart = function(mockedRepository, options, callback){
  const appStart = injectr('../../src/registry/app-start.js', {
        '../components/oc-client/_package/package': { version: '1.2.3' }
      }, { console: { log: sinon.stub() }, __dirname: '.'});
      
  return appStart(mockedRepository, options, callback);
};

const basicOptions = {
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

          const mockedRepository = {
            getComponentVersions: sinon.stub().yields(null, ['1.2.3']),
            publishComponent: sinon.spy()
          };

          getAppStart(mockedRepository, basicOptions, function(){
            expect(mockedRepository.publishComponent.called).to.be.false;
            done();
          });
        });
      });

      describe('when oc-client not found on library', function(){

        it('should publish it', function(done){

          const mockedRepository = {
            getComponentVersions: sinon.stub().yields(null, ['1.0.0']),
            publishComponent: sinon.stub().yields(null, 'ok')
          };

          getAppStart(mockedRepository, basicOptions, function(){
            expect(mockedRepository.publishComponent.called).to.be.true;
            done();
          });
        });
      });
    });
  });
});