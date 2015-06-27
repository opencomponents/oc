'use strict';

var colors = require('colors');
var expect = require('chai').expect;
var path = require('path');
var sinon = require('sinon');
var _ = require('underscore');

describe('cli : facade : publish', function(){

  var Registry = require(__BASE + '/cli/domain/registry'),
      registry = new Registry(),
      consoleMock = require(__BASE + '/test/mocks/console'),
      Local = require(__BASE + '/cli/domain/local'),
      local = new Local(),
      PublishFacade = require(__BASE + '/cli/facade/publish'),
      publishFacade = new PublishFacade({ registry: registry, local: local, logger: consoleMock }),
      logs;

  var execute = function(){
    consoleMock.reset();
    publishFacade({ componentPath: path.resolve('test/fixtures/components/hello-world/') });
    logs = consoleMock.get();
  };

  afterEach(consoleMock.reset);

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
        expect(logs[0]).to.equal('an error!'.red);
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

        var message = logs[0],
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
            expect(logs[1]).to.equal('An error happened when creating the package: the component is not valid'.red);
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

              var message = logs[1],
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

                expect(logs[2]).to.include('Publishing -> ');
              });

              it('should publish to all registries', function(){
                sinon.stub(registry, 'putComponent').yields('blabla');
                execute();
                registry.putComponent.restore();

                expect(logs[2]).to.include('http://www.api.com');
                expect(logs[4]).to.include('http://www.api2.com');
              });

              describe('when error happens', function(){

                beforeEach(function(){
                  sinon.stub(registry, 'putComponent').yields('nope!');
                  execute();
                });

                afterEach(function(){
                  registry.putComponent.restore();
                });

                it('should show an error', function(){
                  expect(logs[3]).to.include('An error happened when publishing the component: nope!');
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
                  expect(logs[3]).to.include('Published -> ');
                  expect(logs[3]).to.include('http://www.api.com/hello-world/1.0.0');
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
