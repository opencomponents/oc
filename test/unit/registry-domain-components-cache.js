'use strict';

var expect = require('chai').expect;
var injctr = require('injectr');
var sinon = require('sinon');

describe('registry : domain : components-cache', function(){

  var mockedCdn = {
    getFile: sinon.stub(),
    listSubDirectories: sinon.stub(),
    putFileContent: sinon.stub()
  };

  var setIntervalStub,
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
    setIntervalStub = sinon.stub();
    var ComponentsCache = injctr('../../registry/domain/components-cache.js', {
      '../../utils/get-unix-utc-timestamp': function(){
        return 12345678;
      }
    }, { setInterval: setIntervalStub });

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

      before(function(done){
        mockedCdn.getFile.yields(null, baseResponse);
        initialise();
        componentsCache.load(saveCallbackResult(done));
      });

      it('should request it to cdn', function(){
        expect(mockedCdn.getFile.called).to.be.true;
      });

      it('should use it as a source of thruth', function(done){
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

    describe('when library does not contain components.json', function(){

      before(function(done){
        mockedCdn.getFile.yields('not_found');
        mockedCdn.listSubDirectories.onCall(0).yields(null, ['hello-world']);
        mockedCdn.listSubDirectories.onCall(1).yields(null, ['1.0.0', '1.0.2']);
        mockedCdn.putFileContent.yields(null, 'ok');
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