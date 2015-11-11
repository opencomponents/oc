'use strict';

var colors = require('colors');
var expect = require('chai').expect;
var sinon = require('sinon');

describe('cli : facade : unlink', function(){

  var logSpy = {},
      Local = require('../../cli/domain/local'),
      local = new Local({ logger: { log: function(){} } }),  
      UnlinkFacade = require('../../cli/facade/unlink'),
      unlinkFacade = new UnlinkFacade({ local:local, logger: logSpy });

  describe('when unlinking component', function(){

    describe('when an error happens', function(){

      beforeEach(function(){
        logSpy.log = sinon.spy();
        sinon.stub(local, 'unlink').yields('an error!');
        unlinkFacade({ componentName: 'a-component' });
      });

      afterEach(function(){
        local.unlink.restore();
      });

      it('should show the error', function(){
        expect(logSpy.log.args[0][0]).to.equal('an error!'.red);
      });
    });

    describe('when it succeeds', function(){

      beforeEach(function(){
        logSpy.log = sinon.spy();
        sinon.stub(local, 'unlink').yields(null, 'yay');
        unlinkFacade({ componentName: 'a-component' });
      });

      afterEach(function(){
        local.unlink.restore();
      });

      it('should show a confirmation message', function(){
        expect(logSpy.log.args[0][0]).to.equal('oc Component unlinked'.green);
      });
    });
  });
});
