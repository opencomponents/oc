'use strict';

var colors = require('colors');
var consoleMock = require('../mocks/console');
var expect = require('chai').expect;
var sinon = require('sinon');

describe('cli : facade : link', function(){

  var LinkFacade = require('../../cli/facade/link'),
      Local = require('../../cli/domain/local'),
      local = new Local(),
      linkFacade = new LinkFacade({ local: local, logger: consoleMock }),
      logs;

  var execute = function(){
    consoleMock.reset();
    linkFacade({ componentName: 'hello' });
    logs = consoleMock.get();
  };

  describe('when linking component', function(){

    describe('when an error happens', function(){

      beforeEach(function(){
        sinon.stub(local, 'link').yields('an error!');
        execute();
      });

      afterEach(function(){
        local.link.restore();
      });

      it('should show the error', function(){
        expect(logs[0]).to.equal('an error!'.red);
      });
    }); 

    describe('when it succeeds', function(){

      beforeEach(function(){
        sinon.stub(local, 'link').yields(null, 'yay');
        execute();
      });
      
      afterEach(function(){
        local.link.restore();
      });

      it('should show a confirmation message', function(){
        expect(logs[0]).to.equal('oc Component linked'.green);
      });
    });
  });
});