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
      eventsHandlerStub,
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
    eventsHandlerStub = { fire: sinon.stub() };
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

  describe('when library does not contain components.json', function(){

    describe('when initialising the cache', function(){

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
        componentsCache.load(eventsHandlerStub, saveCallbackResult(done));
      });

      it('should try fetching the components.json', function(){
        expect(mockedCdn.getFile.calledOnce).to.be.true;
        expect(mockedCdn.getFile.args[0][0]).to.be.equal('component/components.json');
      });

      it('should scan for directories to fetch components and versions', function(){
        expect(mockedCdn.listSubDirectories.calledTwice).to.be.true;
      });

      it('should then save the directories\' data to components.json file in cdn', function(){
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

  describe('when library contains outdated components.json', function(){

    describe('when initialising the cache', function(){

      before(function(done){
        mockedCdn.getFile = sinon.stub();
        mockedCdn.getFile.yields(null, baseResponse);
        mockedCdn.listSubDirectories = sinon.stub();
        mockedCdn.listSubDirectories.onCall(0).yields(null, ['hello-world']);
        mockedCdn.listSubDirectories.onCall(1).yields(null, ['1.0.0', '1.0.2', '2.0.0']);
        mockedCdn.putFileContent = sinon.stub();
        mockedCdn.putFileContent.yields(null, 'ok');
        setInterval = sinon.stub();
        initialise();
        componentsCache.load(eventsHandlerStub, saveCallbackResult(done));
      });

      it('should fetch the components.json', function(){
        expect(mockedCdn.getFile.calledOnce).to.be.true;
        expect(mockedCdn.getFile.args[0][0]).to.be.equal('component/components.json');
      });

      it('should scan for directories to fetch components and versions', function(){
        expect(mockedCdn.listSubDirectories.calledTwice).to.be.true;
      });

      it('should then save the directories\' data to components.json file in cdn', function(){
        expect(mockedCdn.putFileContent.called).to.be.true;
        expect(mockedCdn.putFileContent.args[0][2]).to.be.true;
        expect(JSON.parse(mockedCdn.putFileContent.args[0][0])).to.eql({
          lastEdit: 12345678,
          components: {
            'hello-world': ['1.0.0', '1.0.2', '2.0.0']
          }
        });
      });

      it('should start the refresh loop', function(){
        expect(setIntervalStub.called).to.be.true;
        expect(setIntervalStub.args[0][1]).to.equal(5000);
      });
    });
  });

  describe('when library contains updated components.json', function(){

    describe('when initialising the cache', function(){

      before(function(done){
        setInterval = sinon.stub();
        mockedCdn.getFile = sinon.stub();
        mockedCdn.getFile.yields(null, baseResponse);
        mockedCdn.listSubDirectories = sinon.stub();
        mockedCdn.listSubDirectories.onCall(0).yields(null, ['hello-world']);
        mockedCdn.listSubDirectories.onCall(1).yields(null, ['1.0.0', '1.0.2']);
        mockedCdn.putFileContent = sinon.stub();
        initialise();
        componentsCache.load(eventsHandlerStub, saveCallbackResult(done));
      });

      it('should fetch the components.json', function(){
        expect(mockedCdn.getFile.calledOnce).to.be.true;
        expect(mockedCdn.getFile.args[0][0]).to.be.equal('component/components.json');
      });

      it('should scan for directories to fetch components and versions', function(){
        expect(mockedCdn.listSubDirectories.calledTwice).to.be.true;
      });

      it('should not modify components.json', function(){
        expect(mockedCdn.putFileContent.called).to.be.false;
      });

      it('should use it as a source of truth', function(done){
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

      describe('when refresh errors', function(){

        before(function(done){
          clearInterval = sinon.stub();
          setInterval = sinon.stub();
          mockedCdn.getFile = sinon.stub();
          mockedCdn.getFile.yields(null, baseResponse);
          mockedCdn.putFileContent = sinon.stub();
          mockedCdn.putFileContent.yields(null, 'ok');
          mockedCdn.listSubDirectories = sinon.stub();
          mockedCdn.listSubDirectories.onCall(0).yields(null, ['hello-world']);
          mockedCdn.listSubDirectories.onCall(1).yields(null, ['1.0.0', '1.0.2']);
          mockedCdn.listSubDirectories.onCall(2).yields(null, ['hello-world', 'new-component']);
          mockedCdn.listSubDirectories.onCall(3).yields('an error!');
          mockedCdn.listSubDirectories.onCall(4).yields(null, ['1.0.0']);

          initialise();
          componentsCache.load(eventsHandlerStub, function(err, res){
            componentsCache.refresh(saveCallbackResult(done));
          });
        });

        it('should generate an error event', function(){
          expect(eventsHandlerStub.fire.called).to.be.true;
          expect(eventsHandlerStub.fire.args[0][0]).to.equal('cache-poll');
          expect(eventsHandlerStub.fire.args[1][0]).to.equal('error');
          expect(eventsHandlerStub.fire.args[1][1].code).to.equal('components_cache_refresh');
          expect(eventsHandlerStub.fire.args[1][1].message).to.contain('an error!');
        });
      });

      describe('when refresh does not generate errors', function(){

        before(function(done){
          clearInterval = sinon.stub();
          setInterval = sinon.stub();
          mockedCdn.getFile = sinon.stub();
          mockedCdn.getFile.yields(null, baseResponse);
          mockedCdn.putFileContent = sinon.stub();
          mockedCdn.putFileContent.yields(null, 'ok');
          mockedCdn.listSubDirectories = sinon.stub();
          mockedCdn.listSubDirectories.onCall(0).yields(null, ['hello-world']);
          mockedCdn.listSubDirectories.onCall(1).yields(null, ['1.0.0', '1.0.2']);
          mockedCdn.listSubDirectories.onCall(2).yields(null, ['hello-world', 'new-component']);
          mockedCdn.listSubDirectories.onCall(3).yields(null, ['1.0.0', '1.0.2', '2.0.0']);
          mockedCdn.listSubDirectories.onCall(4).yields(null, ['1.0.0']);

          initialise();
          componentsCache.load(eventsHandlerStub, function(err, res){
            componentsCache.refresh(saveCallbackResult(done));
          });
        });

        it('should have started, stopped and restarted the refresh loop', function(){
          expect(setIntervalStub.calledTwice).to.be.true;
          expect(clearIntervalStub.calledOnce).to.be.true;
        });

        it('should do list requests to cdn', function(){
          expect(mockedCdn.listSubDirectories.args.length).to.equal(5);
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
  });
});