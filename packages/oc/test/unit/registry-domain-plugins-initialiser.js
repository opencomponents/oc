const expect = require('chai').expect;
const injectr = require('injectr');
const sinon = require('sinon');

describe('registry : domain : plugins-initialiser', () => {
  const pluginsInitialiser = require('../../dist/registry/domain/plugins-initialiser');
  const emitWarning = sinon.stub();
  const warned = new Set();
  const deprecate = sinon.stub().callsFake(({ id, subject, replacement }) => {
    if (warned.has(id)) {
      return;
    }
    warned.add(id);
    emitWarning(
      `${subject} is deprecated and will be removed in OpenComponents v1 - use ${replacement} instead.`,
      'DeprecationWarning'
    );
  });
  const pluginsInitialiserWithWarning = injectr(
    '../../dist/registry/domain/plugins-initialiser.js',
    { '../../utils/deprecate': { __esModule: true, default: deprecate } }
  );

  describe('when initialising not valid plugins', () => {
    describe('when plugin not registered correctly', () => {
      let error;
      beforeEach((done) => {
        const plugins = [
          {
            name: 'doSomething'
          }
        ];

        pluginsInitialiser
          .init(plugins)
          .catch((err) => {
            error = err;
          })
          .finally(done);
      });

      it('should error', () => {
        expect(error.toString()).to.be.eql(
          'Error: Plugin doSomething is not valid'
        );
      });
    });

    describe('when plugin is anonymous', () => {
      let error;
      beforeEach((done) => {
        const plugins = [
          {
            register: {
              register: () => {},
              execute: () => {}
            }
          }
        ];

        pluginsInitialiser
          .init(plugins)
          .catch((err) => {
            error = err;
          })
          .finally(done);
      });

      it('should error', () => {
        expect(error.toString()).to.be.eql('Error: Plugin 1 is not valid');
      });
    });

    describe('when plugin does not expose a register method', () => {
      let error;
      beforeEach((done) => {
        const plugins = [
          {
            name: 'doSomething',
            register: { execute: () => {} }
          }
        ];

        pluginsInitialiser
          .init(plugins)
          .catch((err) => {
            error = err;
          })
          .finally(done);
      });

      it('should error', () => {
        expect(error.toString()).to.be.eql(
          'Error: Plugin doSomething is not valid'
        );
      });
    });

    describe('when plugin does not expose an execute method', () => {
      let error;
      beforeEach((done) => {
        const plugins = [
          {
            name: 'doSomething',
            register: { register: () => {} }
          }
        ];

        pluginsInitialiser
          .init(plugins)
          .catch((err) => {
            error = err;
          })
          .finally(done);
      });

      it('should error', () => {
        expect(error.toString()).to.be.eql(
          'Error: Plugin doSomething is not valid'
        );
      });
    });
  });

  describe('when initialising valid plugins', () => {
    let passedOptions;
    let flag;
    let result;
    beforeEach((done) => {
      const plugins = [
        {
          name: 'getValue',
          description: 'Function description',
          register: {
            register: (options, deps, cb) => {
              passedOptions = options;
              cb();
            },
            execute: (key) => passedOptions[key]
          },
          options: { a: 123, b: 456 }
        },
        {
          name: 'isFlagged',
          register: {
            register: (options, deps, cb) => {
              setTimeout(() => {
                flag = true;
                cb();
              }, 10);
            },
            execute: () => flag
          }
        }
      ];

      pluginsInitialiser
        .init(plugins)
        .then((res) => {
          result = res;
        })
        .finally(done);
    });

    it('should register plugin with passed options', () => {
      expect(passedOptions).to.eql({ a: 123, b: 456 });
    });

    it('should expose the functionalities using the plugin names', () => {
      expect(result.getValue.handler).to.be.a('function');
      expect(result.isFlagged.handler).to.be.a('function');
    });

    it('should expose descriptions on the plugin functions if defined', () => {
      expect(result.getValue.description).to.equal('Function description');
      expect(result.isFlagged.description).to.equal('');
    });

    it('should be make the functionality usable', () => {
      const a = result.getValue.handler('a');
      const flagged = result.isFlagged.handler();

      expect(a).to.equal(123);
      expect(flagged).to.equal(true);
    });
  });

  describe('when initialising promise-based plugins', () => {
    it('awaits their registration and exposes their handlers', async () => {
      let registered = false;
      const result = await pluginsInitialiser.init([
        {
          name: 'asyncPlugin',
          register: {
            register: async () => {
              await Promise.resolve();
              registered = true;
            },
            execute: () => registered
          }
        }
      ]);

      expect(result.asyncPlugin.handler()).to.equal(true);
    });

    it('rejects when async registration fails', async () => {
      let error;

      try {
        await pluginsInitialiser.init([
          {
            name: 'failingAsyncPlugin',
            register: {
              register: async () => {
                throw new Error('async registration failed');
              },
              execute: () => {}
            }
          }
        ]);
      } catch (err) {
        error = err;
      }

      expect(error.message).to.equal('async registration failed');
    });

    it('uses the returned promise when the callback also completes', async () => {
      let error;

      try {
        await pluginsInitialiser.init([
          {
            name: 'hybridPlugin',
            register: {
              register: (_options, _dependencies, next) => {
                next();
                return Promise.reject(new Error('promise registration failed'));
              },
              execute: () => {}
            }
          }
        ]);
      } catch (err) {
        error = err;
      }

      expect(error.message).to.equal('promise registration failed');
    });
  });

  describe('when initialising callback-based plugins', () => {
    beforeEach(() => {
      deprecate.resetHistory();
      emitWarning.resetHistory();
      warned.clear();
    });

    it('warns once while preserving callback registration', async () => {
      const result = await pluginsInitialiserWithWarning.init([
        {
          name: 'callbackPluginA',
          register: {
            register: (_options, _dependencies, next) => next(),
            execute: () => 'a'
          }
        },
        {
          name: 'callbackPluginB',
          register: {
            register: (_options, _dependencies, next) => next(),
            execute: () => 'b'
          }
        }
      ]);

      expect(result.callbackPluginA.handler()).to.equal('a');
      expect(result.callbackPluginB.handler()).to.equal('b');
      expect(emitWarning.calledOnce).to.be.true;
      expect(emitWarning.firstCall.args[0]).to.contain(
        'Plugin register callbacks'
      );
    });

    it('does not warn for promise-based registration', async () => {
      await pluginsInitialiserWithWarning.init([
        {
          name: 'promisePlugin',
          register: {
            register: async () => {},
            execute: () => 'promise'
          }
        }
      ]);

      expect(deprecate.called).to.be.false;
    });
  });

  describe('when plugin specifies dependencies', () => {
    let passedDeps;
    let flag;
    beforeEach((done) => {
      const plugins = [
        {
          name: 'isFlagged',
          register: {
            register: (options, deps, cb) => {
              flag = true;
              cb();
            },
            execute: () => flag
          }
        },
        {
          name: 'getValue',
          register: {
            register: (options, deps, cb) => {
              passedDeps = deps;
              cb();
            },
            execute: () => {},
            dependencies: ['isFlagged']
          },
          options: {}
        }
      ];

      pluginsInitialiser
        .init(plugins)
        .catch(() => {})
        .finally(done);
    });

    it('should provide the getValue register method with the required dependent plugins', () => {
      expect(passedDeps.isFlagged.handler()).to.eql(true);
    });
  });

  describe('when plugins have a circular dependency', () => {
    let flag;
    let error;
    beforeEach((done) => {
      const plugins = [
        {
          name: 'getValue',
          register: {
            register: (options, deps, cb) => {
              cb();
            },
            execute: () => {},
            dependencies: ['isFlagged']
          },
          options: {}
        },
        {
          name: 'isFlagged',
          register: {
            register: (options, deps, cb) => {
              flag = true;
              cb();
            },
            execute: () => flag,
            dependencies: ['getValue']
          }
        }
      ];

      pluginsInitialiser
        .init(plugins)
        .catch((err) => {
          error = err;
        })
        .finally(done);
    });

    it('should throw an error', () => {
      expect(error.toString()).to.eql(
        'Error: Dependency Cycle Found: getValue -> isFlagged -> getValue'
      );
    });
  });

  describe('when plugin depends on a plugin that is not registered', () => {
    let error;
    beforeEach((done) => {
      const plugins = [
        {
          name: 'getValue',
          register: {
            register: (options, deps, cb) => {
              cb();
            },
            execute: () => {},
            dependencies: ['isFlagged']
          },
          options: {}
        }
      ];

      pluginsInitialiser
        .init(plugins)
        .catch((err) => {
          error = err;
        })
        .finally(done);
    });

    it('should throw an error', () => {
      expect(error.toString()).to.eql(
        'Error: unknown plugin dependency: isFlagged'
      );
    });
  });

  describe('when plugin chain requires multiple passes', () => {
    let flag;
    let result;
    beforeEach((done) => {
      const plugins = [
        {
          name: 'doSomething',
          register: {
            register: (options, deps, cb) => {
              cb();
            },
            execute: () => true,
            dependencies: ['getValue']
          },
          options: {}
        },
        {
          name: 'getValue',
          register: {
            register: (options, deps, cb) => {
              cb();
            },
            execute: () => {},
            dependencies: ['isFlagged']
          },
          options: {}
        },
        {
          name: 'isFlagged',
          register: {
            register: (options, deps, cb) => {
              flag = true;
              cb();
            },
            execute: () => flag
          }
        }
      ];

      pluginsInitialiser
        .init(plugins)
        .then((res) => {
          result = res;
        })
        .finally(done);
    });

    it('should defer the initalisation of the plugin until all dependencies have bee registered', () => {
      expect(result.doSomething.handler()).to.eql(true);
    });
  });

  it('should keep deferred plugins isolated across concurrent initialisations', async () => {
    let resolveBaseRegistration;
    let signalBaseRegistrationStarted;
    const baseRegistrationStarted = new Promise((resolve) => {
      signalBaseRegistrationStarted = resolve;
    });

    const firstBasePlugin = {
      name: 'base',
      register: {
        register: () =>
          new Promise((resolve) => {
            resolveBaseRegistration = resolve;
            signalBaseRegistrationStarted();
          }),
        execute: () => 'first'
      }
    };
    const firstDependentPlugin = {
      name: 'firstDependent',
      register: {
        register: async () => {},
        execute: () => 'dependent',
        dependencies: ['base']
      }
    };

    const firstInitialisation = pluginsInitialiser.init([
      firstDependentPlugin,
      firstBasePlugin
    ]);
    await baseRegistrationStarted;

    const secondInitialisation = pluginsInitialiser.init([
      {
        name: 'base',
        register: {
          register: async () => {},
          execute: () => 'second'
        }
      }
    ]);

    const secondResult = await secondInitialisation;
    resolveBaseRegistration();
    const firstResult = await firstInitialisation;

    expect(secondResult).to.not.have.property('firstDependent');
    expect(firstResult).to.have.all.keys('base', 'firstDependent');
  });
});
