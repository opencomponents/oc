'use strict';

var expect = require('chai').expect;
var injctr = require('injectr');
var sinon = require('sinon');
var _ = require('underscore');

describe('registry : domain : components-cache', function(){

  var mockedCdn = {
    getFile: sinon.stub(),
    listSubDirectories: sinon.stub(),
    putFileContent: sinon.stub()
  };

  var setIntervalStub,
      clearIntervalStub,
      componentsCache,
      baseOptions = { pollingInterval: 5, s3: { componentsDir: 'component'}},
      response,
      baseResponse = JSON.stringify({
        lastEdit: 12345678,
        components: {
          'hello-world': ['1.0.0', '1.0.2']
        }
      });

  var initialise = function(){
    clearIntervalStub = sinon.stub();
    setIntervalStub = sinon.stub();
    var ComponentsCache = injctr('../../registry/domain/components-cache.js', {
      '../../utils/get-unix-utc-timestamp': function(){
        return 12345678;
      }
    }, { 
      setInterval: setIntervalStub,
      clearInterval: clearIntervalStub
    });

    componentsCache = new ComponentsCache(baseOptions, mockedCdn);
  };

  var saveCallbackResult = function(callback){
    return function(err, res){
      response = { error: err, result: res };
      callback();
    };
  };

  describe('when loading components and versions', function(){

    describe('when library contains components.json', function(){

      describe('when intialising the cache', function(){

        before(function(done){
          setInterval = sinon.stub();
          mockedCdn.getFile = sinon.stub();
          mockedCdn.getFile.yields(null, baseResponse);
          initialise();
          componentsCache.load(saveCallbackResult(done));
        });

        it('should request it to cdn', function(){
          expect(mockedCdn.getFile.called).to.be.true;
        });

        it('should use it as a source of truth', function(done){
          expect(mockedCdn.listSubDirectories.called).to.be.false;

          componentsCache.get(function(err, res){
            expect(res).to.eql({
              lastEdit: 12345678,
              components: {
                'hello-world': ['1.0.0', '1.0.2']
              }
            });
            done();
          });
        });

        it('should start the refresh loop', function(){
          expect(setIntervalStub.called).to.be.true;
          expect(setIntervalStub.args[0][1]).to.equal(5000);
        });
      });

      describe('when refreshing the cache', function(){

        var baseResponseUpdated = JSON.parse(baseResponse);
        baseResponseUpdated.components['hello-world'].push('2.0.0');
        baseResponseUpdated.components['new-component'] = ['1.0.0'];
        baseResponseUpdated.lastEdit++;
        baseResponseUpdated = JSON.stringify(baseResponseUpdated);

        before(function(done){
          clearInterval = sinon.stub();
          setInterval = sinon.stub();
          mockedCdn.getFile = sinon.stub();
          mockedCdn.getFile.yields(null, baseResponse);
          mockedCdn.listSubDirectories = sinon.stub();
          mockedCdn.listSubDirectories.onCall(0).yields(null, ['hello-world', 'new-component']);
          mockedCdn.listSubDirectories.onCall(1).yields(null, ['1.0.0', '1.0.2', '2.0.0']);
          mockedCdn.listSubDirectories.onCall(2).yields(null, ['1.0.0']);
          mockedCdn.putFileContent = sinon.stub();
          mockedCdn.putFileContent.yields(null, 'ok');
          initialise();
          componentsCache.load(function(err, res){
            componentsCache.refresh(saveCallbackResult(done));
          });
        });

        it('should have started, stopped and restarted the refresh loop', function(){
          expect(setIntervalStub.calledTwice).to.be.true;
          expect(clearIntervalStub.calledOnce).to.be.true;
        });

        it('should do list requests to cdn', function(){
          expect(mockedCdn.listSubDirectories.args.length).to.equal(3);
        });

        it('should do write request to cdn', function(){
          expect(mockedCdn.putFileContent.calledOnce).to.be.true;
        });

        it('should refresh the values', function(done){
          componentsCache.get(function(err, data){
            expect(data.lastEdit).to.equal(12345678);
            expect(data.components['new-component']).to.eql(['1.0.0']);
            expect(data.components['hello-world'].length).to.equal(3);
            done();
          });
        });

      });

    });

    describe('when library does not contain components.json', function(){

      before(function(done){
        mockedCdn.getFile = sinon.stub();
        mockedCdn.getFile.yields('not_found');
        mockedCdn.listSubDirectories = sinon.stub();
        mockedCdn.listSubDirectories.onCall(0).yields(null, ['hello-world']);
        mockedCdn.listSubDirectories.onCall(1).yields(null, ['1.0.0', '1.0.2']);
        mockedCdn.putFileContent = sinon.stub();
        mockedCdn.putFileContent.yields(null, 'ok');
        setInterval = sinon.stub();
        initialise();
        componentsCache.load(saveCallbackResult(done));
      });

      it('should first request component.json it to cdn', function(){
        expect(mockedCdn.getFile.called).to.be.true;
      });

      it('should then request directories lists to cdn', function(){
        expect(mockedCdn.listSubDirectories.args.length).to.equal(2);
      });

      it('should then save the components.json file to cdn', function(){
        expect(mockedCdn.putFileContent.called).to.be.true;
        expect(mockedCdn.putFileContent.args[0][2]).to.be.true;
        expect(JSON.parse(mockedCdn.putFileContent.args[0][0])).to.eql({
          lastEdit: 12345678,
          components: {
            'hello-world': ['1.0.0', '1.0.2']
          }
        });
      });

      it('should start the refresh loop', function(){
        expect(setIntervalStub.called).to.be.true;
        expect(setIntervalStub.args[0][1]).to.equal(5000);
      });
    });
  });
});