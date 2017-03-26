'use strict';

var colors = require('colors/safe');
var expect = require('chai').expect;
var injectr = require('injectr');
var path = require('path');
var sinon = require('sinon');
var _ = require('underscore');

describe('cli : facade : package', function(){

  var logSpy = {},
      Registry = require('../../src/cli/domain/registry'),
      registry = new Registry(),
      Local = require('../../src/cli/domain/local'),
      local = new Local({ logger: { log: function(){} } }),
      readStub = sinon.stub().yields(null, 'test'),
      PackageFacade = injectr('../../src/cli/facade/package.js', { read: readStub }),
      packageFacade = new PackageFacade({ registry: registry, local: local, logger: logSpy });

  var execute = function(compress, cb){
    logSpy.log = sinon.stub();
    packageFacade({
      componentPath: 'test/fixtures/components/hello-world/',
      compress: compress
    }, function(){
      cb();
    });
  };

  describe('when packaging component', function(){

    it('should show a message', function(done){
      sinon.stub(local, 'package').yields('the component is not valid');
      execute(false, function(){
        local.package.restore();

        var message = logSpy.log.args[0][0],
            re = new RegExp('\\' + path.sep, 'g'),
            messageWithSlashesOnPath = message.replace(re, '/');

        expect(messageWithSlashesOnPath).to.include('Packaging -> ');
        expect(messageWithSlashesOnPath).to.include('components/hello-world/_package');
        done();
      });
    });

    describe('when packaging', function(){

      describe('when a component is not valid', function(){

        beforeEach(function(done){
          sinon.stub(local, 'package').yields('the component is not valid');
          execute(false, done);
        });

        afterEach(function(){
          local.package.restore();
        });

        it('should show an error', function(){
          expect(logSpy.log.args[1][0]).to.equal(colors.red('An error happened when creating the package: the component is not valid'));
        });
      });

      describe('when a component is valid', function(){

        beforeEach(function(){
          sinon.stub(local, 'package').yields(null, {
            name: 'hello-world',
            version: '1.0.0'
          });
        });

        afterEach(function(){
          local.package.restore();
        });

        describe('when creating tar.gz archive', function(){

          beforeEach(function(){
            sinon.stub(local, 'compress').yields(null);
          });

          afterEach(function(){
            local.compress.restore();
          });

          it('should show a message', function(done){
            execute(true, function(){

              var message = logSpy.log.args[1][0],
                  re = new RegExp('\\' + path.sep, 'g'),
                  messageWithSlashesOnPath = message.replace(re, '/');

              expect(messageWithSlashesOnPath).to.include('Compressing -> ');
              expect(messageWithSlashesOnPath).to.include('components/hello-world/package.tar.gz');
              done();
            });
          });

          it('should not compress when option set to false', function(done){
            execute(false, function(){
              var message = logSpy.log.args[0][0],
                  re = new RegExp('\\' + path.sep, 'g'),
                  messageWithSlashesOnPath = message.replace(re, '/');

              expect(messageWithSlashesOnPath).to.include('Packaging -> ');
              expect(messageWithSlashesOnPath).to.include('components/hello-world/_package');
              expect(logSpy.log.args[1]).to.be.undefined;
              done();
            });
          });
        });
      });
    });
  });
});
