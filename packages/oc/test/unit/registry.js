const expect = require('chai').expect;
const injectr = require('injectr');
const sinon = require('sinon');

describe('registry', () => {
  const repositoryInitStub = sinon.stub();
  let adapter;

  const createAdapter = () => ({
    native: sinon.stub().returns('express instance'),
    listen: sinon.stub(),
    onServerError: sinon.stub(),
    httpServer: sinon.stub().returns('server instance'),
    isListening: sinon.stub().returns(false),
    close: sinon.stub()
  });

  const serverAdapterFactory = sinon.stub();
  const deprecateStub = sinon.stub();

  const deps = {
    './app-start': sinon.stub(),
    './domain/events-handler': { fire: sinon.stub() },
    './domain/server-adapter': sinon.stub().callsFake(() => {
      adapter = createAdapter();
      return adapter;
    }),
    './middleware': {
      bind: sinon
        .stub()
        .callsFake((httpServerAdapter) => httpServerAdapter)
    },
    './domain/plugins-initialiser': { init: sinon.stub() },
    './domain/repository': sinon.stub().returns({
      init: repositoryInitStub,
      close: sinon.stub().resolves()
    }),
    './router': { create: sinon.stub() },
    './domain/options-sanitiser': sinon.stub(),
    './domain/validators': {
      validateRegistryConfiguration: sinon.stub()
    },
    '../utils/deprecate': { __esModule: true, default: deprecateStub }
  };

  const Registry = injectr('../../dist/registry/index.js', deps).default;

  describe('when instanciated', () => {
    describe('when options are not valid', () => {
      let init;
      beforeEach(() => {
        deps['./domain/validators'].validateRegistryConfiguration.returns({
          isValid: false,
          message: 'blargh'
        });
        init = () => {
          Registry({});
        };
      });

      it('should throw an error', () => {
        expect(init).to.throw('blargh');
      });
    });

    describe('when options are valid', () => {
      let registry;
      beforeEach(() => {
        deps['./domain/validators'].validateRegistryConfiguration.returns({
          isValid: true
        });
        deps['./domain/options-sanitiser'].returns({
          port: 3000,
          server: { adapter: serverAdapterFactory, options: { port: 3000 } }
        });
        registry = Registry({});
      });

      it('should instantiate the HTTP server adapter', () => {
        expect(
          deps['./domain/server-adapter'].calledWith(serverAdapterFactory, {
            port: 3000
          })
        ).to.be.true;
      });

      it('should bind the middleware', () => {
        const bind = deps['./middleware'].bind;
        expect(bind.called).to.be.true;
        expect(bind.lastCall.args[0]).to.equal(adapter);
        expect(bind.lastCall.args[1]).to.eql({
          port: 3000,
          server: { adapter: serverAdapterFactory, options: { port: 3000 } }
        });
      });

      it('should instanciate the repository', () => {
        expect(deps['./domain/repository'].called).to.be.true;
      });

      describe('when starting it', () => {
        describe('when plugins initialiser fails', () => {
          let error;
          beforeEach((done) => {
            deps['./domain/plugins-initialiser'].init.rejects(
              new Error('error!')
            );
            registry.start((err) => {
              error = err;
              done();
            });
          });

          it('should fail with error', () => {
            expect(error.message).to.equal('error!');
          });
        });

        describe('when plugins initialiser succeeds', () => {
          describe('when repository initialisation fails', () => {
            let error;
            beforeEach((done) => {
              deps['./domain/plugins-initialiser'].init.resolves('ok');
              repositoryInitStub.rejects(new Error('nope'));

              registry.start((err) => {
                error = err;
                done();
              });
            });

            it('should fail with error', () => {
              expect(error.message).to.equal('nope');
            });
          });

          describe('when repository initialisation succeeds', () => {
            describe('when app fails to start', () => {
              let error;
              beforeEach((done) => {
                deps['./domain/plugins-initialiser'].init.resolves('ok');
                repositoryInitStub.resolves('ok');
                deps['./app-start'].rejects({ msg: 'I got a problem' });

                registry.start((err) => {
                  error = err;
                  done();
                });
              });

              it('should fail with error', () => {
                expect(error).to.equal('I got a problem');
              });
            });

            describe('when app starts', () => {
              describe('when http listener errors', () => {
                let error;
                beforeEach((done) => {
                  deps['./domain/plugins-initialiser'].init.resolves('ok');
                  repositoryInitStub.resolves('ok');
                  deps['./app-start'].resolves('ok');

                  adapter.listen.callsFake((_opts, cb) =>
                    cb('Port is already used')
                  );

                  registry.start((err) => {
                    error = err;
                    done();
                  });
                });

                it('should fail with error', () => {
                  expect(error).to.equal('Port is already used');
                });
              });

              describe('when http listener succeeds', () => {
                let error;
                let result;
                beforeEach((done) => {
                  deps['./domain/plugins-initialiser'].init.resolves('ok');
                  repositoryInitStub.resolves('ok');
                  deps['./app-start'].resolves('ok');
                  deps['./domain/events-handler'].fire = sinon.stub();

                  adapter.listen.callsFake((_opts, cb) => cb(null));

                  registry.start((err, res) => {
                    error = err;
                    result = res;
                    done();
                  });
                });

                it('should not return error', () => {
                  expect(error).to.be.null;
                });

                it('should return the server instance', () => {
                  expect(result.app).to.not.be.null;
                  expect(result.server).to.not.be.null;
                });

                it('should emit a start event', () => {
                  expect(deps['./domain/events-handler'].fire.args[0]).to.eql([
                    'start',
                    {}
                  ]);
                });
              });

              describe('when http listener emits an error before the listener to start', () => {
                let error;
                beforeEach((done) => {
                  deps['./domain/plugins-initialiser'].init.resolves('ok');
                  repositoryInitStub.resolves('ok');
                  deps['./app-start'].resolves('ok');
                  deps['./domain/events-handler'].fire = sinon.stub();

                  adapter.listen.callsFake(() => undefined);
                  adapter.onServerError.callsFake((cb) =>
                    cb('I failed for some reason')
                  );

                  registry.start((err) => {
                    error = err;
                    done();
                  });
                });

              it('should return error', () => {
                expect(error).to.be.equal('I failed for some reason');
              });

              it('should emit an error event', () => {
                expect(deps['./domain/events-handler'].fire.args[0]).to.eql([
                  'error',
                  {
                    code: 'EXPRESS_ERROR',
                    message: 'I failed for some reason'
                  }
                ]);
              });
            });
          });
        });
      });

      describe('when starting it with the promise API', () => {
        beforeEach(() => {
          deprecateStub.resetHistory();
          deps['./domain/plugins-initialiser'].init.resolves('ok');
          repositoryInitStub.resolves('ok');
          deps['./app-start'].resolves('ok');
          deps['./domain/events-handler'].fire = sinon.stub();
        });

        it('should resolve with { app, server }', (done) => {
          adapter.listen.callsFake((_opts, cb) => cb(null));

          registry.start().then((result) => {
            expect(result).to.include({
              app: 'express instance',
              server: 'server instance'
            });
            done();
          });
        });

        it('should reject with an Error when startup fails', (done) => {
          deps['./app-start'].rejects(new Error('nope'));

          registry
            .start()
            .then(() => done(new Error('should have rejected')))
            .catch((err) => {
              expect(err).to.be.an.instanceOf(Error);
              expect(err.message).to.equal('nope');
              done();
            });
        });

        it('should still invoke a callback passed alongside the promise', (done) => {
          adapter.listen.callsFake((_opts, cb) => cb(null));

          let callbackResult;
          const promise = registry.start((err, res) => {
            callbackResult = { err, res };
          });

          promise.then(() => {
            expect(callbackResult.err).to.be.null;
            expect(callbackResult.res.app).to.equal('express instance');
            done();
          });
        });

        it('should emit a single deprecation notice when a callback is used', (done) => {
          adapter.listen.callsFake((_opts, cb) => cb(null));

          registry.start(() => {}).then(() => {
            expect(deprecateStub.calledOnce).to.be.true;
            expect(deprecateStub.args[0][0]).to.include({
              id: 'registry-callback-api'
            });
            done();
          });
        });

        it('should not emit a deprecation notice when no callback is used', (done) => {
          adapter.listen.callsFake((_opts, cb) => cb(null));

          registry.start().then(() => {
            expect(deprecateStub.called).to.be.false;
            done();
          });
        });
      });

      describe('when closing it', () => {
        let repositoryCloseStub;

        beforeEach(() => {
          repositoryCloseStub = sinon.stub().resolves();
          deps['./domain/repository'].returns({
            init: repositoryInitStub,
            close: repositoryCloseStub
          });
          deps['./domain/validators'].validateRegistryConfiguration.returns({
            isValid: true
          });
          deps['./domain/options-sanitiser'].returns({
            port: 3000,
            server: { adapter: serverAdapterFactory, options: { port: 3000 } }
          });
        });

        it('should close the repository when the server is not listening', (done) => {
          const registry = Registry({});

          registry.close((err) => {
            expect(err).to.equal('not opened');
            expect(repositoryCloseStub.calledOnce).to.be.true;
            done();
          });
        });

        it('should close the server then the repository when listening', (done) => {
          const registry = Registry({});
          adapter.listen.callsFake((_opts, cb) => cb(null));
          adapter.isListening.returns(true);
          adapter.close.callsFake((cb) => cb(undefined));

          registry.start(() => {
            registry.close((err) => {
              expect(err).to.be.undefined;
              expect(adapter.close.calledOnce).to.be.true;
              expect(repositoryCloseStub.calledOnce).to.be.true;
              expect(repositoryCloseStub.calledAfter(adapter.close)).to.be.true;
              done();
            });
          });
        });

        it('should still call the repository close when the server close errors', (done) => {
          const serverError = new Error('close failed');
          const registry = Registry({});
          adapter.listen.callsFake((_opts, cb) => cb(null));
          adapter.isListening.returns(true);
          adapter.close.callsFake((cb) => cb(serverError));

          registry.start(() => {
            registry.close((err) => {
              expect(err).to.equal(serverError);
              expect(repositoryCloseStub.calledOnce).to.be.true;
              done();
            });
          });
        });

        it('should resolve when closing with the promise API', (done) => {
          deprecateStub.resetHistory();
          const registry = Registry({});
          adapter.isListening.returns(false);

          registry.close().then(() => {
            expect(repositoryCloseStub.calledOnce).to.be.true;
            done();
          });
        });

        it('should emit a deprecation notice when closing with a callback', (done) => {
          deprecateStub.resetHistory();
          const registry = Registry({});
          adapter.isListening.returns(false);

          registry.close(() => {
            expect(deprecateStub.calledOnce).to.be.true;
            expect(deprecateStub.args[0][0]).to.include({
              id: 'registry-callback-api'
            });
            done();
          });
        });
      });

      describe('when registering a plugin', () => {
        beforeEach(() => {
          deprecateStub.resetHistory();
        });

        it('should resolve with the promise API', (done) => {
          registry
            .register({})
            .then(() => {
              expect(deprecateStub.called).to.be.false;
              done();
            })
            .catch(done);
        });

        it('should emit a deprecation notice when a callback is used', (done) => {
          registry.register({}, () => {}).then(() => {
            expect(deprecateStub.calledOnce).to.be.true;
            expect(deprecateStub.args[0][0]).to.include({
              id: 'registry-callback-api'
            });
            done();
          });
        });
      });
    });
  });
});
});
