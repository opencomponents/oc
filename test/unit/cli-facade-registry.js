'use strict';

var colors = require('colors');
var expect = require('chai').expect;
var injectr = require('injectr');
var sinon = require('sinon');

describe('cli : facade : registry', function(){

  var logSpy = {},
      processSpy = {},
      Registry = require('../../cli/domain/registry'),
      registry = new Registry(),
      RegistryFacade = injectr('../../cli/facade/registry.js', {}, { process: processSpy }),
      registryFacade = new RegistryFacade({ registry: registry, logger: logSpy });

  var execute = function(command){
    logSpy.log = sinon.spy();
    processSpy.exit = sinon.spy();
    registryFacade({ command: command });
  };

  describe('when using ls command', function(){

    describe('when no registries linked to the app', function(){
      
      beforeEach(function(){
        sinon.stub(registry, 'get').yields(null, []);
        execute('ls');
      }); 

      afterEach(function(){
        registry.get.restore();
      });

      it('should introduce the list of registries', function(){
        expect(logSpy.log.args[0][0]).to.equal('oc linked registries:'.yellow);
      });

      it('should log an error', function(){
        expect(logSpy.log.args[1][0]).to.equal('oc registries not found. Run "oc registry add <registry href>"'.red);
      });

      it('should exit with 1 code', function(){
        expect(processSpy.exit.calledOnce).to.be.true;
        expect(processSpy.exit.args[0][0]).to.equal(1);
      });
    });

    describe('when registries linked to the app', function(){

      beforeEach(function(){
        sinon.stub(registry, 'get').yields(null, [ 'http://www.registry.com', 'https://www.anotherregistry.com' ]);
        execute('ls');
      });

      afterEach(function(){
        registry.get.restore();
      });

      it('should introduce the list of registries', function(){
        expect(logSpy.log.args[0][0]).to.equal('oc linked registries:'.yellow);
      });

      it('should list the linked registries', function(){
        expect(logSpy.log.args[1][0]).to.equal('http://www.registry.com'.green);
        expect(logSpy.log.args[2][0]).to.equal('https://www.anotherregistry.com'.green);
      });
    });
  });

  describe('when using add command', function(){

    describe('when adding a not valid registry', function(){

      beforeEach(function(){
        sinon.stub(registry, 'add').yields('An error!!!', null);
        execute('add');
      });

      afterEach(function(){
        registry.add.restore();
      });

      it('should show the error', function(){
        expect(logSpy.log.args[0][0]).to.equal('An error!!!'.red);
      });

      it('should exit with 1 code', function(){
        expect(processSpy.exit.calledOnce).to.be.true;
        expect(processSpy.exit.args[0][0]).to.equal(1);
      });
    });

    describe('when adding a valid registry', function(){

      beforeEach(function(){
        sinon.stub(registry, 'add').yields(null, 'ok!');
        execute('add');
      });

      beforeEach(function(){
        registry.add.restore();
      });

      it('should show a confirmation message', function(){
        expect(logSpy.log.args[0][0]).to.equal('oc registry added'.green);
      });
    });
  });

  describe('when using remove command', function(){

    describe('when removing a registry and having some problem removing it', function(){

      beforeEach(function(){
        sinon.stub(registry, 'remove').yields('something bad happened!', null);
        execute('remove');
      });

      afterEach(function(){
        registry.remove.restore();
      });

      it('should show the error', function(){
        expect(logSpy.log.args[0][0]).to.equal('something bad happened!'.red);
      });

      it('should exit with 1 code', function(){
        expect(processSpy.exit.calledOnce).to.be.true;
        expect(processSpy.exit.args[0][0]).to.equal(1);
      });
    });

    describe('when removing a valid registry', function(){

      beforeEach(function(){
        sinon.stub(registry, 'remove').yields(null, 'ok!');
        execute('remove');
      });

      afterEach(function(){
        registry.remove.restore();
      });

      it('should show a confirmation message', function (){
        expect(logSpy.log.args[0][0]).to.equal('oc registry deleted'.green);
      });
    });
  });
});