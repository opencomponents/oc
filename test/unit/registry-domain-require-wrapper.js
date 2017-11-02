'use strict';

const expect = require('chai').expect;
const vm = require('vm');

describe('registry : domain : require-wrapper', () => {
  const RequireWrapper = require('../../src/registry/domain/require-wrapper');

  describe('when using the require wrapper in a clear context', () => {
    let result, error;
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
  });
});
