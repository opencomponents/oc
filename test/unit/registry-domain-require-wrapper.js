const expect = require('chai').expect;
const injectr = require('injectr');
const sinon = require('sinon');
const vm = require('node:vm');

describe('registry : domain : require-wrapper', () => {
  const RequireWrapper =
    require('../../dist/registry/domain/require-wrapper').default;

  describe('when using the require wrapper in a clear context', () => {
    let result;
    let error;
    const execute = (dependencies, script) => {
      const context = {
        require: RequireWrapper(dependencies),
        result: null,
        console
      };
      try {
        vm.runInNewContext(script, context);
        result = context.result;
      } catch (e) {
        error = e;
      }
    };

    describe('when requiring a dependency', () => {
      before(() => {
        const script = `var _ = require('lodash'); result = _.first([5, 4, 3, 2, 1]);`;
        execute(['lodash'], script);
      });

      it('should correctly make the dependency require-able', () => {
        expect(result).to.eql(5);
      });
    });

    describe('when requiring an unrecognised dependency', () => {
      before(() => {
        const script = `var someModule = require('some-module'); result = someModule.someFunction('John Doe');`;
        execute([], script);
      });

      it('should correctly throw an error', () => {
        expect(error).to.eql({
          code: 'DEPENDENCY_MISSING_FROM_REGISTRY',
          missing: ['some-module']
        });
      });
    });

    describe('when requiring a core dependency', () => {
      before(() => {
        const script = `var url = require('url'); result = url.parse('www.google.com').href;`;
        execute(['url'], script);
      });

      it('should correctly require and use the dependency', () => {
        expect(result).to.equal('www.google.com');
      });
    });

    describe('when requiring a core dependency with node: prefix', () => {
      before(() => {
        const script = `var path = require('node:path'); result = path.join('a', 'b');`;
        execute(['node:path'], script);
      });

      it('should correctly require and use the dependency', () => {
        expect(result).to.equal('a/b');
      });
    });

    describe('when requiring an unvetted core dependency', () => {
      before(() => {
        const script = `var url = require('url'); result = url.parse('www.google.com').href;`;
        execute(['querystring'], script);
      });

      it('should correctly throw an error', () => {
        expect(error).to.eql({
          code: 'DEPENDENCY_MISSING_FROM_REGISTRY',
          missing: ['url']
        });
      });
    });

    describe('when requiring a dependency with a relative path', () => {
      before(() => {
        const script = `var _ = require('lodash/lodash'); result = _.first([5, 4, 3, 2, 1]);`;
        execute(['lodash'], script);
      });

      it('should correctly make the dependency require-able', () => {
        expect(result).to.equal(5);
      });
    });

    describe('when requiring a dependency with a relative path that does not exist', () => {
      before(() => {
        const script = `var _ = require('lodash/foo'); result = _.first([5, 4, 3, 2, 1]);`;
        execute(['lodash'], script);
      });

      it('should correctly throw an error', () => {
        expect(error).to.eql({
          code: 'DEPENDENCY_MISSING_FROM_REGISTRY',
          missing: ['lodash/foo']
        });
      });
    });

    describe('when try-require fails with absolute path but succeeds with package name', () => {
      let tryRequireStub;

      before(() => {
        tryRequireStub = sinon.stub();
        tryRequireStub.onCall(0).returns(undefined);
        tryRequireStub.onCall(1).returns({ esmFallback: true });

        const InjectedRequireWrapper = injectr(
          '../../dist/registry/domain/require-wrapper.js',
          {
            'try-require': tryRequireStub
          }
        ).default;

        const context = {
          require: InjectedRequireWrapper(['esm-only-module']),
          result: null,
          console
        };
        try {
          vm.runInNewContext(
            `var m = require('esm-only-module'); result = m.esmFallback;`,
            context
          );
          result = context.result;
        } catch (e) {
          error = e;
        }
      });

      it('should fall back to requiring by package name', () => {
        expect(result).to.be.true;
      });
    });

    describe('when a core module and npm package share the same name', () => {
      let tryRequireStub;

      before(() => {
        tryRequireStub = sinon.stub();
        tryRequireStub
          .withArgs(sinon.match(/node_modules/))
          .returns({ isNpmPackage: true });
        tryRequireStub.withArgs('url').returns({ isCoreModule: true });

        const InjectedRequireWrapper = injectr(
          '../../dist/registry/domain/require-wrapper.js',
          {
            'try-require': tryRequireStub
          }
        ).default;

        const context = {
          require: InjectedRequireWrapper(['url']),
          result: null,
          console
        };
        try {
          vm.runInNewContext(
            `var m = require('url'); result = m.isCoreModule;`,
            context
          );
          result = context.result;
        } catch (e) {
          error = e;
        }
      });

      it('should prefer the core module', () => {
        expect(result).to.be.true;
      });
    });
  });
});
