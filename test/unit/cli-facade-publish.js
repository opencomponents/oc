'use strict';

var colors = require('colors/safe');
var expect = require('chai').expect;
var injectr = require('injectr');
var path = require('path');
var sinon = require('sinon');

describe('cli : facade : publish', function(){

  var logSpy = {},
      Registry = require('../../src/cli/domain/registry'),
      registry = new Registry(),
      Local = require('../../src/cli/domain/local'),
      local = new Local({ logger: { log: function(){} } }),
      readStub = sinon.stub().yields(null, 'test'),
      PublishFacade = injectr('../../src/cli/facade/publish.js', { read: readStub }),
      publishFacade = new PublishFacade({ registry: registry, local: local, logger: logSpy });

  var execute = function(cb, creds){
    creds = creds || {};
    logSpy.log = sinon.stub();
    publishFacade({
      componentPath: 'test/fixtures/components/hello-world/',
      username: creds.username,
      password: creds.password
    }, function(){
      cb();
    });
  };

  describe('when publishing component', function(){

    describe('when api is not valid', function(){

      beforeEach(function(done){
        sinon.stub(registry, 'get').yields('an error!');
        execute(done);
      });

      afterEach(function(){
        registry.get.restore();
      });

      it('should show an error', function(){
        expect(logSpy.log.args[0][0]).to.equal(colors.red('an error!'));
      });
    });

    describe('when api is valid', function(){

      beforeEach(function(){
        sinon.stub(registry, 'get').yields(null, ['http://www.api.com', 'http://www.api2.com']);
      });

      afterEach(function(){
        registry.get.restore();
      });

      it('should show a message', function(done){
        sinon.stub(local, 'package').yields('the component is not valid');
        execute(function(){
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
            execute(done);
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
              sinon.stub(registry, 'putComponent').yields('blabla');
              execute(function(){
                registry.putComponent.restore();

                var message = logSpy.log.args[1][0],
                    re = new RegExp('\\' + path.sep, 'g'),
                    messageWithSlashesOnPath = message.replace(re, '/');

                expect(messageWithSlashesOnPath).to.include('Compressing -> ');
                expect(messageWithSlashesOnPath).to.include('components/hello-world/package.tar.gz');
                done();
              });
            });

            describe('when publishing', function(){

              it('should show a message', function(done){
                sinon.stub(registry, 'putComponent').yields('blabla');
                execute(function(){
                  registry.putComponent.restore();

                  expect(logSpy.log.args[2][0]).to.include('Publishing -> ');
                  done();
                });
              });

              it('should publish to all registries', function(done){
                sinon.stub(registry, 'putComponent').yields(null, 'ok');
                execute(function(){
                  registry.putComponent.restore();

                  expect(logSpy.log.args[2][0]).to.include('http://www.api.com');
                  expect(logSpy.log.args[4][0]).to.include('http://www.api2.com');
                  done();
                });
              });

              describe('when a generic error happens', function(){

                beforeEach(function(done){
                  sinon.stub(registry, 'putComponent').yields('nope!');
                  execute(done);
                });

                afterEach(function(){
                  registry.putComponent.restore();
                });

                it('should show an error', function(){
                  expect(logSpy.log.args[3][0]).to.include('An error happened when publishing the component: nope!');
                });
              });

              describe('when using an old cli', function(){

                beforeEach(function(done){
                  sinon.stub(registry, 'putComponent').yields({
                    code: 'cli_version_not_valid',
                    error: 'OC CLI version is not valid: Registry 1.23.4, CLI 0.1.2',
                    details: {
                      code: 'old_version',
                      cliVersion: '0.1.2',
                      registryVersion: '1.23.4',
                      suggestedVersion: '1.23.X'
                    }
                  });
                  execute(done);
                });

                afterEach(function(){
                  registry.putComponent.restore();
                });

                it('should show an error', function(){
                  expect(logSpy.log.args[3][0]).to.equal(colors.red('An error happened when publishing the component: the version of used ' +
                    'OC CLI is invalid. Try to upgrade OC CLI running ' + colors.blue('[sudo] npm i -g oc@1.23.X')));
                });
              });

              describe('when using an old node version', function(){

                beforeEach(function(done){
                  sinon.stub(registry, 'putComponent').yields({
                    code: 'node_version_not_valid',
                    error: 'Node CLI version is not valid: Registry 0.10.36, CLI 0.10.35',
                    details: {
                      code: 'not_matching',
                      cliNodeVersion: '0.10.35',
                      registryNodeVersion: '0.10.36',
                      suggestedVersion: '>=0.10.35'
                    }
                  });
                  execute(done);
                });

                afterEach(function(){
                  registry.putComponent.restore();
                });

                it('should show an error', function(){
                  expect(logSpy.log.args[3][0]).to.equal(colors.red('An error happened when publishing the component: the version of used ' +
                    'node is invalid. Try to upgrade node to version matching \'>=0.10.35\''));
                });
              });

              describe('when registry requires authentication', function(){
                beforeEach(function(done){
                  sinon.stub(registry, 'putComponent').yields('Unauthorized');
                  execute(done);
                });

                afterEach(function(){
                  registry.putComponent.restore();
                });

                it('should prompt for credentials', function(){
                  expect(logSpy.log.args[3][0]).to.equal(colors.yellow('Registry requires credentials.'));
                });
              });

              describe('when credentials are prepopulated', function(){
                beforeEach(function(done){
                  sinon.stub(registry, 'putComponent').yields('Unauthorized');
                  execute(done, {
                      username: 'myuser',
                      password: 'password'
                  });
                });

                afterEach(function(){
                  registry.putComponent.restore();
                });

                it('should not prompt for credentials', function(){
                  expect(logSpy.log.args[4][0]).to.equal(colors.green('Using specified credentials'));
                });
              });

              describe('when it succeeds', function(){

                var stub;
                beforeEach(function(done){
                  sinon.stub(registry, 'putComponent').yields(null, 'yay');
                  stub = sinon.stub(local, 'cleanup').yields(null, 'done');
                  execute(done);
                });

                afterEach(function(){
                  registry.putComponent.restore();
                  local.cleanup.restore();
                });

                it('should show a message', function(){
                  expect(logSpy.log.args[3][0]).to.include('Published -> ');
                  expect(logSpy.log.args[3][0]).to.include('http://www.api.com/hello-world/1.0.0');
                });

                it('should remove the compressed package', function(){
                  expect(stub.calledOnce).to.be.true;
                });
              });
            });
          });
        });
      });
    });
  });
});
