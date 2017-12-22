'use strict';

const expect = require('chai').expect;

describe('registry : domain : plugins-initialiser', () => {
  const pluginsInitialiser = require('../../src/registry/domain/plugins-initialiser');

  describe('when initialising not valid plugins', () => {
    describe('when plugin not registered correctly', () => {
      let error;
      beforeEach(done => {
        const plugins = [
          {
            name: 'doSomething'
          }
        ];

        pluginsInitialiser.init(plugins, err => {
          error = err;
          done();
        });
      });

      it('should error', () => {
        expect(error.toString()).to.be.eql(
          'Error: Plugin doSomething is not valid'
        );
      });
    });

    describe('when plugin is anonymous', () => {
      let error;
      beforeEach(done => {
        const plugins = [
          {
            register: {
              register: function() {},
              execute: function() {}
            }
          }
        ];

        pluginsInitialiser.init(plugins, err => {
          error = err;
          done();
        });
      });

      it('should error', () => {
        expect(error.toString()).to.be.eql('Error: Plugin 1 is not valid');
      });
    });

    describe('when plugin does not expose a register method', () => {
      let error;
      beforeEach(done => {
        const plugins = [
          {
            name: 'doSomething',
            register: { execute: function() {} }
          }
        ];

        pluginsInitialiser.init(plugins, err => {
          error = err;
          done();
        });
      });

      it('should error', () => {
        expect(error.toString()).to.be.eql(
          'Error: Plugin doSomething is not valid'
        );
      });
    });

    describe('when plugin does not expose an execute method', () => {
      let error;
      beforeEach(done => {
        const plugins = [
          {
            name: 'doSomething',
            register: { register: function() {} }
          }
        ];

        pluginsInitialiser.init(plugins, err => {
          error = err;
          done();
        });
      });

      it('should error', () => {
        expect(error.toString()).to.be.eql(
          'Error: Plugin doSomething is not valid'
        );
      });
    });
  });

  describe('when initialising valid plugins', () => {
    let passedOptions, flag, result;
    beforeEach(done => {
      const plugins = [
        {
          name: 'getValue',
          register: {
            register: (options, deps, cb) => {
              passedOptions = options;
              cb();
            },
            execute: key => passedOptions[key]
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

      pluginsInitialiser.init(plugins, (err, res) => {
        result = res;
        done();
      });
    });

    it('should register plugin with passed options', () => {
      expect(passedOptions).to.eql({ a: 123, b: 456 });
    });

    it('should expose the functionalities using the plugin names', () => {
      expect(result.getValue).to.be.a('function');
      expect(result.isFlagged).to.be.a('function');
    });

    it('should be make the functionality usable', () => {
      const a = result.getValue('a');
      const flagged = result.isFlagged();

      expect(a).to.equal(123);
      expect(flagged).to.equal(true);
    });
  });

  describe('when plugin specifies dependencies', () => {
    let passedDeps, flag;
    beforeEach(done => {
      const plugins = [
        {
          name: 'isFlagged',
          register: {
            register: function(options, deps, cb) {
              flag = true;
              cb();
            },
            execute: function() {
              return flag;
            }
          }
        },
        {
          name: 'getValue',
          register: {
            register: function(options, deps, cb) {
              passedDeps = deps;
              cb();
            },
            execute: function() {},
            dependencies: ['isFlagged']
          },
          options: {}
        }
      ];

      pluginsInitialiser.init(plugins, () => {
        done();
      });
    });

    it('should provide the getValue register method with the required dependent plugins', () => {
      expect(passedDeps.isFlagged()).to.eql(true);
    });
  });

  describe('when plugins have a circular dependency', () => {
    let flag, error;
    beforeEach(done => {
      const plugins = [
        {
          name: 'getValue',
          register: {
            register: function(options, deps, cb) {
              cb();
            },
            execute: function() {},
            dependencies: ['isFlagged']
          },
          options: {}
        },
        {
          name: 'isFlagged',
          register: {
            register: function(options, deps, cb) {
              flag = true;
              cb();
            },
            execute: function() {
              return flag;
            },
            dependencies: ['getValue']
          }
        }
      ];

      pluginsInitialiser.init(plugins, err => {
        error = err;
        done();
      });
    });

    it('should throw an error', () => {
      expect(error.toString()).to.eql(
        'Error: Dependency Cycle Found: getValue -> isFlagged -> getValue'
      );
    });
  });

  describe('when plugin depends on a plugin that is not registered', () => {
    let error;
    beforeEach(done => {
      const plugins = [
        {
          name: 'getValue',
          register: {
            register: function(options, deps, cb) {
              cb();
            },
            execute: function() {},
            dependencies: ['isFlagged']
          },
          options: {}
        }
      ];

      pluginsInitialiser.init(plugins, err => {
        error = err;
        done();
      });
    });

    it('should throw an error', () => {
      expect(error.toString()).to.eql(
        'Error: unknown plugin dependency: isFlagged'
      );
    });
  });

  describe('when plugin chain requires multiple passes', () => {
    let flag, result;
    beforeEach(done => {
      const plugins = [
        {
          name: 'doSomething',
          register: {
            register: function(options, deps, cb) {
              cb();
            },
            execute: function() {
              return true;
            },
            dependencies: ['getValue']
          },
          options: {}
        },
        {
          name: 'getValue',
          register: {
            register: function(options, deps, cb) {
              cb();
            },
            execute: function() {},
            dependencies: ['isFlagged']
          },
          options: {}
        },
        {
          name: 'isFlagged',
          register: {
            register: function(options, deps, cb) {
              flag = true;
              cb();
            },
            execute: function() {
              return flag;
            }
          }
        }
      ];

      pluginsInitialiser.init(plugins, (err, res) => {
        result = res;
        done();
      });
    });

    it('should defer the initalisation of the plugin until all dependencies have bee registered', () => {
      expect(result.doSomething()).to.eql(true);
    });
  });
});
