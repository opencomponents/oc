'use strict';

var colors = require('colors');
var expect = require('chai').expect;
var sinon = require('sinon');

describe('cli : facade : link', function(){

  var logSpy = {},
      LinkFacade = require('../../cli/facade/link'),
      Local = require('../../cli/domain/local'),
      local = new Local(),
      linkFacade = new LinkFacade({ local: local, logger: logSpy });

  var execute = function(){
    logSpy.log = sinon.spy();
    linkFacade({ componentName: 'hello' });
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
        expect(logSpy.log.args[0][0]).to.equal('an error!'.red);
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
        expect(logSpy.log.args[0][0]).to.equal('oc Component linked'.green);
      });
    });
  });
});