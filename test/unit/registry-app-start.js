'use strict';

var expect = require('chai').expect;
var injectr = require('injectr');
var sinon = require('sinon');

var getAppStart = function(mockedRepository, options, callback){
  var appStart = injectr('../../registry/app-start.js', {
        './domain/repository': mockedRepository
      }, { console: { log: sinon.stub() }, __dirname: '.'});
      
  return appStart(options, callback);
};

var getMockedRepository = function(methods){
  return function(){
    return {
      getComponent: methods.getComponent,
      publishComponent: methods.publishComponent
    };
  };
};

describe('registry : app-start', function(){

  describe('when registry starting', function(){

    describe('when registry in local mode', function(){

      it('should do nothing', function(done){

        var getComponentSpy = sinon.spy(),
            mockedRepository = getMockedRepository({ getComponent: getComponentSpy }),
            options = { local: true };

        getAppStart(mockedRepository, options, function(err, res){
          expect(res).to.be.eql('ok');
          expect(err).to.be.null;
          expect(getComponentSpy.called).to.be.false;
          done();
        });
      });
    });

    describe('when not in local mode', function(){

      describe('when client found on library', function(){

        it('should not publish it', function(done){

          var getComponentStub = sinon.stub(),
              publishComponentSpy = sinon.spy(),
              mockedRepository = getMockedRepository({ 
                getComponent: getComponentStub, 
                publishComponent: publishComponentSpy }),
              options = {
                s3: {
                  path: 'path',
                  componentsDir: 'componentsDir'
                }
              };

          getComponentStub.yields(null, 'found');

          getAppStart(mockedRepository, options, function(err, res){
            expect(publishComponentSpy.called).to.be.false;
            done();
          });
        });
      });

      describe('when client not found on library', function(){

        it('should publish it', function(done){

          var getComponentStub = sinon.stub(),
              publishComponentStub = sinon.stub(),
              mockedRepository = getMockedRepository({ 
                getComponent: getComponentStub, 
                publishComponent: publishComponentStub }),
              options = {
                s3: {
                  path: 'path',
                  componentsDir: 'componentsDir'
                }
              };

          getComponentStub.yields('not found');
          publishComponentStub.yields(null, 'ok');

          getAppStart(mockedRepository, options, function(err, res){
            expect(publishComponentStub.called).to.be.true;
            done();
          });
        });
      });

    });
  });
});