const expect = require('chai').expect;
const injectr = require('injectr');
const sinon = require('sinon');

describe('registry', () => {
  const repositoryInitStub = sinon.stub();
  let adapter;

  const createAdapter = () => ({
    native: sinon.stub().returns('express instance'),
    supportsPromiseLifecycle: true,
    listen: sinon.stub(),
    onServerError: sinon.stub(),
    httpServer: sinon.stub().returns('server instance'),
    isListening: sinon.stub().returns(false),
    close: sinon.stub()
  });

  const serverAdapterFactory = sinon.stub();

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
    }
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

      it('should register a plugin using a promise', async () => {
        await registry.register({ name: 'test-plugin' });

        deps['./domain/plugins-initialiser'].init.resolves({});
        repositoryInitStub.resolves();
        deps['./app-start'].resolves();
        adapter.listen.resolves();

        await registry.start();

        expect(
          deps['./domain/plugins-initialiser'].init.lastCall.args[0][0].name
        ).to.equal('test-plugin');
      });

      it('should emit one deprecation warning for callback forms', () => {
        const emitWarning = sinon.stub(process, 'emitWarning');

        registry.register({ name: 'first-plugin' }, () => {});
        registry.register({ name: 'second-plugin' }, () => {});

        expect(emitWarning.calledOnce).to.be.true;
        expect(emitWarning.firstCall.args[1]).to.equal('DeprecationWarning');
        emitWarning.restore();
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

          it('should reject the promise with an Error', async () => {
            const newRegistry = Registry({});

            let error;
            try {
              await newRegistry.start();
            } catch (err) {
              error = err;
            }

            expect(error.name).to.equal('Error');
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
                expect(error.name).to.equal('Error');
                expect(error.message).to.equal('I got a problem');
              });
            });

            describe('when app starts', () => {
              describe('when http listener errors', () => {
                let error;
                beforeEach((done) => {
                  deps['./domain/plugins-initialiser'].init.resolves('ok');
                  repositoryInitStub.resolves('ok');
                  deps['./app-start'].resolves('ok');

                  adapter.listen.rejects(new Error('Port is already used'));

                  registry.start((err) => {
                    error = err;
                    done();
                  });
                });

                it('should fail with error', () => {
                  expect(error.name).to.equal('Error');
                  expect(error.message).to.equal('Port is already used');
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

                  adapter.listen.resolves();

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

                it('should resolve with the app and server', async () => {
                  const newRegistry = Registry({});
                  adapter.listen.resolves();

                  const result = await newRegistry.start();

                  expect(result).to.eql({
                    app: 'express instance',
                    server: 'server instance'
                  });
                });

                it('should invoke a callback once when its promise is awaited', async () => {
                  const newRegistry = Registry({});
                  const callback = sinon.spy();
                  adapter.listen.resolves();

                  const result = await newRegistry.start(callback);

                  expect(callback.calledOnce).to.be.true;
                  expect(callback.calledWith(null, result)).to.be.true;
                });

                it('should reject the returned promise when the callback throws', async () => {
                  const newRegistry = Registry({});
                  adapter.listen.resolves();

                  let error;
                  try {
                    await newRegistry.start(() => {
                      throw new Error('callback failed');
                    });
                  } catch (err) {
                    error = err;
                  }

                  expect(error.message).to.equal('callback failed');
                });

                it('should support callback-only adapters through the promise API', async () => {
                  const newRegistry = Registry({});
                  adapter.supportsPromiseLifecycle = false;
                  let finishListen;
                  adapter.listen.callsFake((_opts, cb) => {
                    finishListen = cb;
                  });

                  const startPromise = newRegistry.start();
                  await new Promise((resolve) => setImmediate(resolve));

                  expect(finishListen).to.be.a('function');
                  finishListen();
                  const result = await startPromise;

                  expect(result).to.eql({
                    app: 'express instance',
                    server: 'server instance'
                  });
                });
              });

              describe('when http listener emits an error before the listener to start', () => {
                let error;
                beforeEach((done) => {
                  deps['./domain/plugins-initialiser'].init.resolves('ok');
                  repositoryInitStub.resolves('ok');
                  deps['./app-start'].resolves('ok');
                  deps['./domain/events-handler'].fire = sinon.stub();

                  adapter.listen.callsFake(() => new Promise(() => {}));
                  adapter.onServerError.callsFake((cb) =>
                    cb('I failed for some reason')
                  );

                  registry.start((err) => {
                    error = err;
                    done();
                  });
                });

              it('should return error', () => {
                expect(error.name).to.equal('Error');
                expect(error.message).to.equal('I failed for some reason');
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
          adapter.listen.resolves();
          adapter.isListening.returns(true);
          adapter.close.resolves();

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

        it('should resolve after the server and repository close', async () => {
          let resolveRepositoryClose;
          repositoryCloseStub.callsFake(
            () =>
              new Promise((resolve) => {
                resolveRepositoryClose = resolve;
              })
          );
          const registry = Registry({});
          adapter.isListening.returns(true);
          adapter.close.resolves();

          let closed = false;
          const closePromise = registry.close().then(() => {
            closed = true;
          });
          await new Promise((resolve) => setImmediate(resolve));

          expect(adapter.close.calledOnce).to.be.true;
          expect(repositoryCloseStub.calledOnce).to.be.true;
          expect(repositoryCloseStub.calledAfter(adapter.close)).to.be.true;
          expect(closed).to.be.false;

          resolveRepositoryClose();
          await closePromise;

          expect(closed).to.be.true;
        });

        it('should reject when the server was not opened', async () => {
          const registry = Registry({});

          let error;
          try {
            await registry.close();
          } catch (err) {
            error = err;
          }

          expect(error).to.equal('not opened');
          expect(repositoryCloseStub.calledOnce).to.be.true;
        });

        it('should still call the repository close when the server close errors', (done) => {
          const serverError = new Error('close failed');
          const registry = Registry({});
          adapter.listen.resolves();
          adapter.isListening.returns(true);
          adapter.close.rejects(serverError);

          registry.start(() => {
            registry.close((err) => {
              expect(err).to.equal(serverError);
              expect(repositoryCloseStub.calledOnce).to.be.true;
              done();
            });
          });
        });

        it('should support callback-only adapters when closing through the promise API', async () => {
          const registry = Registry({});
          adapter.supportsPromiseLifecycle = false;
          adapter.isListening.returns(true);
          let finishClose;
          adapter.close.callsFake((cb) => {
            finishClose = cb;
          });

          const closePromise = registry.close();
          await new Promise((resolve) => setImmediate(resolve));

          expect(adapter.close.calledOnce).to.be.true;
          expect(repositoryCloseStub.called).to.be.false;

          finishClose();
          await closePromise;

          expect(repositoryCloseStub.calledOnce).to.be.true;
        });
      });
    });
  });
});
});
