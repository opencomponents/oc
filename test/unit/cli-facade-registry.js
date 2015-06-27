'use strict';

var colors = require('colors');
var expect = require('chai').expect;
var sinon = require('sinon');
var consoleMock = require('../../test/mocks/console');

describe('cli : facade : registry', function(){

  var Registry = require('../../cli/domain/registry'),
      registry = new Registry(),
      RegistryFacade = require('../../cli/facade/registry'),
      registryFacade = new RegistryFacade({ registry: registry, logger: consoleMock }),
      logs;

  var execute = function(command){
    consoleMock.reset();
    registryFacade({ command: command });
    logs = consoleMock.get();
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
        expect(logs[0]).to.equal('oc linked registries:'.yellow);
      });

      it('should log an error', function(){
        expect(logs[1]).to.equal('oc registries not found. Run "oc registry add <registry href>"'.red);
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
        expect(logs[0]).to.equal('oc linked registries:'.yellow);
      });

      it('should list the linked registries', function(){
        expect(logs[1]).to.equal('http://www.registry.com'.green);
        expect(logs[2]).to.equal('https://www.anotherregistry.com'.green);
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
        expect(logs[0]).to.equal('An error!!!'.red);
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
        expect(logs[0]).to.equal('oc registry added'.green);
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
        expect(logs[0]).to.equal('something bad happened!'.red);
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
        expect(logs[0]).to.equal('oc registry deleted'.green);
      });
    });
  });
});