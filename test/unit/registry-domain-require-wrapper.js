'use strict';

const expect = require('chai').expect;
const vm = require('vm');

describe('registry : domain : require-wrapper', () => {

  const RequireWrapper = require('../../src/registry/domain/require-wrapper');

  describe('when using the require wrapper in a clear context', () => {

    let context;
    const execute = (dependencies, script) => {
      context = { require: new RequireWrapper(dependencies), result: null, console };
      vm.runInNewContext(script, context);
    };

    describe('when requiring a dependency', () => {

      before(() => {
        const script = `var _ = require('lodash'); result = _.first([5, 4, 3, 2, 1]);`;
        execute(['lodash'], script);
      });

      it('should correctly make the dependency require-able', () => {
        expect(context.result).to.eql(5);
      });
    });

    describe('when requiring an unrecognised dependency', () => {

      let f;
      before(() => {
        f = () => {
          script = `var someModule = require('some-module'); result = someModule.someFunction('John Doe');`;
          execute([], script);
        };
      });

      it('should correctly throw an error', () => {
        expect(f).to.throw({
          code: 'DEPENDENCY_MISSING_FROM_REGISTRY',
          missing: ['someModule']
        });
      });
    });

    describe('when requiring a core dependency', () => {

      before(() => {
        const script = `var url = require('url'); result = url.parse('www.google.com').href;`;
        execute(['url'], script);
      });

      it('should correctly require and use the dependency', () => {
        expect(context.result).to.equal('www.google.com');
      });
    });

    describe('when requiring a dependency with a relative path', () => {

      before(() => {
        const script = `var _ = require('lodash/lodash'); result = _.first([5, 4, 3, 2, 1]);`;
        execute(['lodash'], script);
      });

      it('should correctly make the dependency require-able', () => {
        expect(context.result).to.eql(5);
      });
    });

    describe('when requiring a dependency with a relative path that does not exist', () => {

      let f;
      before(() => {
        f = () => {
          const script = `var _ = require('lodash/foo'); result = _.first([5, 4, 3, 2, 1]);`;
          execute(['lodash'], script);
        };
      });

      it('should correctly throw an error', () => {
        expect(f).to.throw({
          code: 'DEPENDENCY_MISSING_FROM_REGISTRY',
          missing: ['someModule']
        });
      });
    });
  });
});
