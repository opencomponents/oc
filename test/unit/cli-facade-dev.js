'use strict';

var colors = require('colors/safe');
var expect = require('chai').expect;
var sinon = require('sinon');

describe('cli : facade : dev', function(){

  var logSpy = {},
      DevFacade = require('../../src/cli/facade/dev'),
      Local = require('../../src/cli/domain/local'),
      local = new Local({ logger: { log: function(){} } }),
      npm = require('npm'),
      devFacade = new DevFacade({ local: local, logger: logSpy });

  var execute = function(dirName, port){
    logSpy.logNoNewLine = sinon.spy();
    logSpy.log = sinon.spy();
    devFacade({ dirName: dirName, port: port }, function(){});
  };

  describe('when running a dev version of the registry', function(){

    describe('when the directory is not found', function(){

      beforeEach(function(){
        sinon.stub(npm, 'load').yields(undefined);
        sinon.stub(local, 'getComponentsByDir').yields('path is not valid!');
        execute();
      });

      afterEach(function(){
        npm.load.restore();
        local.getComponentsByDir.restore();
      });

      it('should show an error', function(){
        expect(logSpy.log.args[0][0]).to.equal(colors.red('path is not valid!'));
      });
    });

    describe('when the directory does not contain any valid component', function(){

      beforeEach(function(){
        sinon.stub(npm, 'load').yields(undefined);
        sinon.stub(local, 'getComponentsByDir').yields(null, []);
        execute();
      });

      afterEach(function(){
        npm.load.restore();
        local.getComponentsByDir.restore();
      });

      it('should show an error', function(){
        expect(logSpy.log.args[0][0]).to.equal(colors.red('An error happened when initialising the dev runner: no components found in specified path'));
      });
    });
  });
});
