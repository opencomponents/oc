'use strict';

var colors = require('colors');
var expect = require('chai').expect;
var sinon = require('sinon');
var consoleMock = require('../mocks/console');

describe('cli : facade : unlink', function(){

  var Local = require('../../cli/domain/local'),
      local = new Local(),
      UnlinkFacade = require('../../cli/facade/unlink'),
      unlinkFacade = new UnlinkFacade({ local:local, logger: consoleMock }),
      logs;

  beforeEach(consoleMock.reset);

  describe('when unlinking component', function(){

    describe('when an error happens', function(){

      beforeEach(function(){
        sinon.stub(local, 'unlink').yields('an error!');
        unlinkFacade({ componentName: 'a-component' });
        logs = consoleMock.get();
      });

      afterEach(function(){
        local.unlink.restore();
      });

      it('should show the error', function(){
        expect(logs[0]).to.equal('an error!'.red);
      });
    });

    describe('when it succeeds', function(){

      beforeEach(function(){
        sinon.stub(local, 'unlink').yields(null, 'yay');
        unlinkFacade({ componentName: 'a-component' });
        logs = consoleMock.get();
      });

      afterEach(function(){
        local.unlink.restore();
      });

      it('should show a confirmation message', function(){
        expect(logs[0]).to.equal('oc Component unlinked'.green);
      });
    });
  });
});