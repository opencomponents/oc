'use strict';

var colors = require('colors');
var expect = require('chai').expect;
var sinon = require('sinon');
var _ = require('underscore');

describe('cli : facade : info', function(){

  var Registry = require('../../cli/domain/registry'),
      registry = new Registry(),
      consoleMock = require('../mocks/console'),
      Local = require('../../cli/domain/local'),
      local = new Local(),
      InfoFacade = require('../../cli/facade/info'),
      infoFacade = new InfoFacade({ registry: registry, local: local, logger: consoleMock }),
      logs;

  var setup = function(stubs){
    _.forEach(stubs, function(stubInfo){
      var stub = sinon.stub(stubInfo.obj, stubInfo.method);
      _.forEach(stubInfo.responses, function(response, i){
        stub.onCall(i).yields(response.err, response.res);
      });
    });
  };

  var execute = function(){
    consoleMock.reset();
    infoFacade();
    logs = consoleMock.get();    
  };

  describe('when showing project info', function(){

    describe('when the information can\'t be retrieved', function(){
      
      beforeEach(function(){
        setup([{ obj: local, method: 'info', responses: [{err: 'something bad happened'}]}]);
        execute();
      });

      afterEach(function(){
        local.info.restore();
      });

      it('should show an error', function(){
        expect(logs[0]).to.be.equal('something bad happened'.red);
      });
    });

    describe('when the information is retrieved', function(){

      describe('when the registry list is blank', function(){

        beforeEach(function(){
          setup([{ obj: local, method: 'info', responses: [{ res: { registries: [] }}]}]);
          execute();
        });

        afterEach(function(){
          local.info.restore();
        });

        it('should show an error', function(){
          expect(logs[0]).to.be.equal('oc registries not found. Run "oc registry add <registry href>"'.red);
        });
      });

      describe('when there are no components linked in the project', function(){

        beforeEach(function(){          
          setup([{ obj: local, method: 'info', responses: [{ res: { registries: ['http://registry.com'], components: {}}}]}]);
          execute();
        });

        afterEach(function(){
          local.info.restore();
        });

        it('should show an error', function(){
          expect(logs[0]).to.be.equal('No components linked in the project'.red);
        });
      });

      describe('when there are components linked in the project', function(){

        beforeEach(function(){     
          setup([{ 
            obj: local, 
            method: 'info', 
            responses: [{
              res: { registries: ['http://registry.com'], components: { 'ghost': '1.X.X', 'hello': '~1.0.0' }}
            }]
          }, {
            obj: registry,
            method: 'getApiComponentByHref',
            responses: [{
              err: 'not_found'
            }, {
              res: {
                name: 'hello',
                version: '1.0.1',
                requestVersion: '~1.0.0',
                description: 'the best component ever',
                href: 'http://registry.com/hello/~1.0.0'
              }
            }]
          }]);

          execute();
        });

        afterEach(function(){
          local.info.restore();
          registry.getApiComponentByHref.restore();
        });

        it('should list the components', function(){
          expect(logs[0]).to.be.equal('Components linked in project:'.yellow);
        }); 

        it('should show a message when a component is not found on the registry', function(){
          expect(logs[1]).to.include('Not available'.red);
        });

        it('should show the component\'s details when it is found on the registry', function(){
          expect(logs[1]).to.include('hello');
          expect(logs[1]).to.include('the best component ever');
          expect(logs[1]).to.include('http://registry.com/hello/~1.0.0');
        });

        it('should show the component\'s resolved version', function(){
          expect(logs[1]).to.include('~1.0.0 => 1.0.1');
        });
      });
    });
  });
});