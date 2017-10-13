'use strict';

const colors = require('colors/safe');
const expect = require('chai').expect;
const injectr = require('injectr');
const path = require('path');
const sinon = require('sinon');

describe('cli : facade : publish', () => {
  const logSpy = {},
    Registry = require('../../src/cli/domain/registry'),
    registry = new Registry(),
    Local = require('../../src/cli/domain/local'),
    local = new Local(),
    readStub = sinon.stub().yields(null, 'test'),
    PublishFacade = injectr('../../src/cli/facade/publish.js', {
      read: readStub
    }),
    publishFacade = new PublishFacade({
      registry,
      local,
      logger: logSpy
    });

  const execute = function(cb, creds) {
    creds = creds || {};
    logSpy.err = sinon.stub();
    logSpy.log = sinon.stub();
    logSpy.ok = sinon.stub();
    logSpy.warn = sinon.stub();
    publishFacade(
      {
        componentPath: 'test/fixtures/components/hello-world/',
        username: creds.username,
        password: creds.password
      },
      () => {
        cb();
      }
    );
  };

  describe('when publishing component', () => {
    describe('when api is not valid', () => {
      beforeEach(done => {
        sinon.stub(registry, 'get').yields('an error!');
        execute(done);
      });

      afterEach(() => {
        registry.get.restore();
      });

      it('should show an error', () => {
        expect(logSpy.err.args[0][0]).to.equal('an error!');
      });
    });

    describe('when api is valid', () => {
      beforeEach(() => {
        sinon
          .stub(registry, 'get')
          .yields(null, ['http://www.api.com', 'http://www.api2.com']);
      });

      afterEach(() => {
        registry.get.restore();
      });

      it('should show a message', done => {
        sinon.stub(local, 'package').yields('the component is not valid');
        execute(() => {
          local.package.restore();
          const message = logSpy.warn.args[1][0],
            re = new RegExp('\\' + path.sep, 'g'),
            messageWithSlashesOnPath = message.replace(re, '/');

          expect(logSpy.warn.args[0][0]).to.equal(
            'Ensuring dependencies are loaded...'
          );
          expect(messageWithSlashesOnPath).to.include('Packaging -> ');
          expect(messageWithSlashesOnPath).to.include(
            'components/hello-world/_package'
          );
          done();
        });
      });

      describe('when packaging', () => {
        describe('when a component is not valid', () => {
          beforeEach(done => {
            sinon.stub(local, 'package').yields('the component is not valid');
            execute(done);
          });

          afterEach(() => {
            local.package.restore();
          });

          it('should show an error', () => {
            expect(logSpy.err.args[0][0]).to.equal(
              'An error happened when creating the package: the component is not valid'
            );
          });
        });

        describe('when a component is valid', () => {
          beforeEach(() => {
            sinon.stub(local, 'package').yields(null, {
              name: 'hello-world',
              version: '1.0.0'
            });
          });

          afterEach(() => {
            local.package.restore();
          });

          describe('when creating tar.gz archive', () => {
            beforeEach(() => {
              sinon.stub(local, 'compress').yields(null);
            });

            afterEach(() => {
              local.compress.restore();
            });

            it('should show a message', done => {
              sinon.stub(registry, 'putComponent').yields('blabla');
              execute(() => {
                registry.putComponent.restore();
                const message = logSpy.warn.args[2][0],
                  re = new RegExp('\\' + path.sep, 'g'),
                  messageWithSlashesOnPath = message.replace(re, '/');

                expect(messageWithSlashesOnPath).to.include('Compressing -> ');
                expect(messageWithSlashesOnPath).to.include(
                  'components/hello-world/package.tar.gz'
                );
                done();
              });
            });

            describe('when publishing', () => {
              it('should show a message', done => {
                sinon.stub(registry, 'putComponent').yields('blabla');
                execute(() => {
                  registry.putComponent.restore();

                  expect(logSpy.warn.args[3][0]).to.include('Publishing -> ');
                  done();
                });
              });

              it('should publish to all registries', done => {
                sinon.stub(registry, 'putComponent').yields(null, 'ok');
                execute(() => {
                  registry.putComponent.restore();

                  expect(logSpy.ok.args[0][0]).to.include('http://www.api.com');
                  expect(logSpy.ok.args[1][0]).to.include(
                    'http://www.api2.com'
                  );
                  done();
                });
              });

              describe('when a generic error happens', () => {
                beforeEach(done => {
                  sinon.stub(registry, 'putComponent').yields('nope!');
                  execute(done);
                });

                afterEach(() => {
                  registry.putComponent.restore();
                });

                it('should show an error', () => {
                  expect(logSpy.err.args[0][0]).to.include(
                    'An error happened when publishing the component: nope!'
                  );
                });
              });

              describe('when a generic error happens from the api', () => {
                beforeEach(done => {
                  sinon
                    .stub(registry, 'putComponent')
                    .yields({ IgotAnError: true });
                  execute(done);
                });

                afterEach(() => {
                  registry.putComponent.restore();
                });

                it('should show an error', () => {
                  expect(logSpy.err.args[0][0]).to.include(
                    'An error happened when publishing the component: {"IgotAnError":true}'
                  );
                });
              });

              describe('when using an old cli', () => {
                beforeEach(done => {
                  sinon.stub(registry, 'putComponent').yields({
                    code: 'cli_version_not_valid',
                    error:
                      'OC CLI version is not valid: Registry 1.23.4, CLI 0.1.2',
                    details: {
                      code: 'old_version',
                      cliVersion: '0.1.2',
                      registryVersion: '1.23.4',
                      suggestedVersion: '1.23.X'
                    }
                  });
                  execute(done);
                });

                afterEach(() => {
                  registry.putComponent.restore();
                });

                it('should show an error', () => {
                  expect(logSpy.err.args[0][0]).to.equal(
                    'An error happened when publishing the component: the version of used ' +
                      'OC CLI is invalid. Try to upgrade OC CLI running ' +
                      colors.blue('[sudo] npm i -g oc@1.23.X')
                  );
                });
              });

              describe('when using an old node version', () => {
                beforeEach(done => {
                  sinon.stub(registry, 'putComponent').yields({
                    code: 'node_version_not_valid',
                    error:
                      'Node CLI version is not valid: Registry 0.10.36, CLI 0.10.35',
                    details: {
                      code: 'not_matching',
                      cliNodeVersion: '0.10.35',
                      registryNodeVersion: '0.10.36',
                      suggestedVersion: '>=0.10.35'
                    }
                  });
                  execute(done);
                });

                afterEach(() => {
                  registry.putComponent.restore();
                });

                it('should show an error', () => {
                  expect(logSpy.err.args[0][0]).to.equal(
                    'An error happened when publishing the component: the version of used ' +
                      "node is invalid. Try to upgrade node to version matching '>=0.10.35'"
                  );
                });
              });

              describe('when registry requires authentication', () => {
                beforeEach(done => {
                  sinon.stub(registry, 'putComponent').yields('Unauthorized');
                  execute(done);
                });

                afterEach(() => {
                  registry.putComponent.restore();
                });

                it('should prompt for credentials', () => {
                  expect(logSpy.warn.args[4][0]).to.equal(
                    'Registry requires credentials.'
                  );
                });
              });

              describe('when credentials are prepopulated', () => {
                beforeEach(done => {
                  sinon.stub(registry, 'putComponent').yields('Unauthorized');
                  execute(done, {
                    username: 'myuser',
                    password: 'password'
                  });
                });

                afterEach(() => {
                  registry.putComponent.restore();
                });

                it('should not prompt for credentials', () => {
                  expect(logSpy.ok.args[0][0]).to.equal(
                    'Using specified credentials'
                  );
                });
              });

              describe('when it succeeds', () => {
                let stub;
                beforeEach(done => {
                  sinon.stub(registry, 'putComponent').yields(null, 'yay');
                  stub = sinon.stub(local, 'cleanup').yields(null, 'done');
                  execute(done);
                });

                afterEach(() => {
                  registry.putComponent.restore();
                  local.cleanup.restore();
                });

                it('should show a message', () => {
                  expect(logSpy.ok.args[0][0]).to.include('Published -> ');
                  expect(logSpy.ok.args[0][0]).to.include(
                    'http://www.api.com/hello-world/1.0.0'
                  );
                });

                it('should remove the compressed package', () => {
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
