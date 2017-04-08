'use strict';

var colors = require('colors/safe');
var expect = require('chai').expect;
var path = require('path');
var sinon = require('sinon');

describe('cli : facade : package', function(){

  var logSpy = {},
    Local = require('../../src/cli/domain/local'),
    local = new Local(),
    PackageFacade = require('../../src/cli/facade/package.js'),
    packageFacade = new PackageFacade({ local: local, logger: logSpy });

  var execute = function(compress, cb){
    logSpy.log = sinon.stub();
    packageFacade({
      componentPath: 'test/fixtures/components/hello-world/',
      compress: compress
    }, function(){
      cb();
    });
  };

  describe('before packaging a component', function(){

    it('should always show a message', function(done){
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

        it('should package and show success message', function(done){
          execute(false, function(){
            var warnMessage = logSpy.log.args[0][0],
              okMessage = logSpy.log.args[1][0],
              re = new RegExp('\\' + path.sep, 'g'),
              warnMessageWithSlashesOnPath = warnMessage.replace(re, '/'),
              okMessageWithSlashesOnPath = okMessage.replace(re, '/');

            expect(warnMessageWithSlashesOnPath).to.include('Packaging -> ');
            expect(warnMessageWithSlashesOnPath).to.include('components/hello-world/_package');

            expect(okMessageWithSlashesOnPath).to.include('Packaged -> ');
            expect(okMessageWithSlashesOnPath).to.include('components/hello-world/_package');
            done();
          });
        });

        describe('when creating tar.gz archive', function(){

          it('should not compress when option set to false', function(done){
            sinon.stub(local, 'compress').yields(null);

            execute(false, function(){
              local.compress.restore();

              var warnMessage = logSpy.log.args[0][0],
                okMessage = logSpy.log.args[1][0],
                re = new RegExp('\\' + path.sep, 'g'),
                warnMessageWithSlashesOnPath = warnMessage.replace(re, '/'),
                okMessageWithSlashesOnPath = okMessage.replace(re, '/');

              expect(warnMessageWithSlashesOnPath).to.include('Packaging -> ');
              expect(okMessageWithSlashesOnPath).to.include('Packaged -> ');
              expect(logSpy.log.args[2]).to.be.undefined;
              done();
            });
          });

          describe('when compression is successful', function(){
            beforeEach(function(){
              sinon.stub(local, 'compress').yields(null);
            });

            afterEach(function(){
              local.compress.restore();
            });

            it('should show a message for success', function(done){
              execute(true, function(){

                var warnMessage = logSpy.log.args[2][0],
                  okMessage = logSpy.log.args[3][0],
                  re = new RegExp('\\' + path.sep, 'g'),
                  warnMessageWithSlashesOnPath = warnMessage.replace(re, '/'),
                  okMessageWithSlashesOnPath = okMessage.replace(re, '/');

                expect(warnMessageWithSlashesOnPath).to.include('Compressing -> ');
                expect(warnMessageWithSlashesOnPath).to.include('components/hello-world/package.tar.gz');
                expect(okMessageWithSlashesOnPath).to.include('Compressed -> ');
                expect(okMessageWithSlashesOnPath).to.include('components/hello-world/package.tar.gz');
                done();
              });
            });
          });

          describe('when compression fails', function(){

            beforeEach(function(){
              sinon.stub(local, 'compress').yields('error while compressing');
            });

            afterEach(function(){
              local.compress.restore();
            });

            it('should show a message for failure', function(done){
              execute(true, function(){

                var warnMessage = logSpy.log.args[2][0],
                  errorMessage = logSpy.log.args[3][0],
                  re = new RegExp('\\' + path.sep, 'g'),
                  warnMessageWithSlashesOnPath = warnMessage.replace(re, '/');

                expect(warnMessageWithSlashesOnPath).to.include('Compressing -> ');
                expect(warnMessageWithSlashesOnPath).to.include('components/hello-world/package.tar.gz');
                expect(errorMessage).to.equal(colors.red('An error happened when creating the package: error while compressing'));
                done();
              });
            });
          });
        });
      });
    });
  });
});
