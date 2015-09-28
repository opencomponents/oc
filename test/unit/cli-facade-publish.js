'use strict';

var colors = require('colors');
var expect = require('chai').expect;
var path = require('path');
var sinon = require('sinon');
var _ = require('underscore');

describe('cli : facade : publish', function(){

  var logSpy = {},
      Registry = require('../../cli/domain/registry'),
      registry = new Registry(),
      Local = require('../../cli/domain/local'),
      local = new Local(),
      PublishFacade = require('../../cli/facade/publish'),
      publishFacade = new PublishFacade({ registry: registry, local: local, logger: logSpy });

  var execute = function(creds){
    creds = creds || {};
    logSpy.log = sinon.stub();
    publishFacade({ componentPath: path.resolve('test/fixtures/components/hello-world/'), username: creds.username, password: creds.password });
  };

  describe('when publishing component', function(){

    describe('when api is not valid', function(){

      beforeEach(function(){
        sinon.stub(registry, 'get').yields('an error!');
        execute();
      });

      afterEach(function(){
        registry.get.restore();
      });

      it('should show an error', function(){
        expect(logSpy.log.args[0][0]).to.equal('an error!'.red);
      });
    });

    describe('when api is valid', function(){

      beforeEach(function(){
        sinon.stub(registry, 'get').yields(null, ['http://www.api.com', 'http://www.api2.com']);
      });

      afterEach(function(){
        registry.get.restore();
      });

      it('should show a message', function(){
        sinon.stub(local, 'package').yields('the component is not valid');
        execute();
        local.package.restore();

        var message = logSpy.log.args[0][0],
            re = new RegExp('\\' + path.sep, 'g'),
            messageWithSlashesOnPath = message.replace(re, '/');

        expect(messageWithSlashesOnPath).to.include('Packaging -> ');
        expect(messageWithSlashesOnPath).to.include('components/hello-world/_package');
      });

      describe('when packaging', function(){

        describe('when a component is not valid', function(){

          beforeEach(function(){
            sinon.stub(local, 'package').yields('the component is not valid');
            execute();
          });

          afterEach(function(){
            local.package.restore();
          });

          it('should show an error', function(){
            expect(logSpy.log.args[1][0]).to.equal('An error happened when creating the package: the component is not valid'.red);
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

            it('should show a message', function(){
              sinon.stub(registry, 'putComponent').yields('blabla');
              execute();
              registry.putComponent.restore();

              var message = logSpy.log.args[1][0],
                  re = new RegExp('\\' + path.sep, 'g'),
                  messageWithSlashesOnPath = message.replace(re, '/');

              expect(messageWithSlashesOnPath).to.include('Compressing -> ');
              expect(messageWithSlashesOnPath).to.include('components/hello-world/package.tar.gz');
            });

            describe('when publishing', function(){

              it('should show a message', function(){
                sinon.stub(registry, 'putComponent').yields('blabla');
                execute();
                registry.putComponent.restore();

                expect(logSpy.log.args[2][0]).to.include('Publishing -> ');
              });

              it('should publish to all registries', function(){
                sinon.stub(registry, 'putComponent').yields('blabla');
                execute();
                registry.putComponent.restore();

                expect(logSpy.log.args[2][0]).to.include('http://www.api.com');
                expect(logSpy.log.args[4][0]).to.include('http://www.api2.com');
              });

              describe('when a generic error happens', function(){

                beforeEach(function(){
                  sinon.stub(registry, 'putComponent').yields('nope!');
                  execute();
                });

                afterEach(function(){
                  registry.putComponent.restore();
                });

                it('should show an error', function(){
                  expect(logSpy.log.args[3][0]).to.include('An error happened when publishing the component: nope!');
                });
              });

              describe('when using an old cli', function(){

                beforeEach(function(){
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
                  execute();
                });

                afterEach(function(){
                  registry.putComponent.restore();
                });

                it('should show an error', function(){
                  expect(logSpy.log.args[3][0]).to.equal(('An error happened when publishing the component: the version of used ' +
                    'OC CLI is invalid. Try to upgrade OC CLI running ' + ('[sudo] npm i -g oc@1.23.X').blue).red);
                });
              });

              describe('when registry requires authentication', function(){
                beforeEach(function(){
                  sinon.stub(registry, 'putComponent').yields('Unauthorized');
                  execute();
                });

                afterEach(function(){
                  registry.putComponent.restore();
                });

                it('should prompt for credentials', function(){
                  expect(logSpy.log.args[3][0]).to.equal(('Registry requires credentials.').yellow);
                });
              });

              describe('when credentials are prepopulated', function(){
                beforeEach(function(){
                  sinon.stub(registry, 'putComponent').yields('Unauthorized');
                  execute({
                      username: 'myuser',
                      password: 'password'
                  });
                });

                afterEach(function(){
                  registry.putComponent.restore();
                });

                it('should not prompt for credentials', function(){
                  expect(logSpy.log.args[4][0]).to.equal(('Using specified credentials').green);
                });
              });

              describe('when it succeeds', function(){

                var stub;
                beforeEach(function(){
                  sinon.stub(registry, 'putComponent').yields(null, 'yay');
                  stub = sinon.stub(local, 'cleanup');
                  execute();
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
