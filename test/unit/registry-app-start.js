'use strict';

var expect = require('chai').expect;
var injectr = require('injectr');
var sinon = require('sinon');

var getAppStart = function(mockedRepository, options, callback){
  var appStart = injectr('../../registry/app-start.js', {
        './domain/repository': function(){
          return mockedRepository;
        },
        '../package.json': { version: '1.2.3' }
      }, { console: { log: sinon.stub() }, __dirname: '.'});
      
  return appStart(options, callback);
};

var basicOptions = {
  s3: {
    path: 'path',
    componentsDir: 'componentsDir'
  }
};

describe('registry : app-start', function(){

  describe('when registry starting', function(){

    describe('when registry in local mode', function(){

      it('should not get the list of the components', function(done){

        var mockedRepository = {
          getComponentsInfoFromJson: sinon.spy()
        };

        var options = { local: true };

        getAppStart(mockedRepository, options, function(err, res){
          expect(res).to.be.eql('ok');
          expect(err).to.be.null;
          expect(mockedRepository.getComponentsInfoFromJson.called).to.be.false;
          done();
        });
      });
    });

    describe('when not in local mode', function(){

      describe('when getting components info via components.json', function(){

        describe('when file exists in library', function(){

          var mockedRepository;
          before(function(done){
            mockedRepository = {
              getComponentsInfoFromJson: sinon.stub().yields(null, { components: { 'hi': ['1.2.3'], 'oc-client': ['1.2.3']}}),
              getComponentsInfoFromDirectories: sinon.spy(),
              saveComponentsInfo: sinon.spy()
            };

            getAppStart(mockedRepository, basicOptions, done);
          });

          it('should not get the list from listing the directories', function(){
            expect(mockedRepository.getComponentsInfoFromDirectories.called).to.be.false;
          });

          it('should not update the file', function(){
            expect(mockedRepository.saveComponentsInfo.called).to.be.false;
          });
        });

        describe('when file does not exist in library', function(){

          var mockedRepository;
          before(function(done){
            mockedRepository = {
              getComponentsInfoFromJson: sinon.stub().yields('not_found'),
              getComponentsInfoFromDirectories: sinon.stub().yields(null, { lastEdit: 12345678, components: { 'hello': ['1.0.0'], 'oc-client': ['1.2.3']}}),
              saveComponentsInfo: sinon.stub().yields(null, 'ok')
            };

            getAppStart(mockedRepository, basicOptions, done);
          });

          it('should get the list from listing the directories', function(){
            expect(mockedRepository.getComponentsInfoFromDirectories.called).to.be.true;
          });

          it('should save the list once is been retrieved', function(){

            var componentsInfo = mockedRepository.saveComponentsInfo.args[0][0];

            expect(mockedRepository.saveComponentsInfo.called).to.be.true;
            expect(componentsInfo.components).to.eql({ 'hello': ['1.0.0'], 'oc-client': ['1.2.3'] });
            expect(componentsInfo.lastEdit).to.be.equal(12345678);
          });
        });

      });

      describe('when oc-client found on library', function(){

        it('should not publish it', function(done){

          var mockedRepository = {
            getComponentsInfoFromJson: sinon.stub().yields(null, { components: { 'oc-client': ['1.2.3'] }}),
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
            getComponentsInfoFromJson: sinon.stub().yields(null, { components: { 'oc-client': ['1.0.0'] }}),
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