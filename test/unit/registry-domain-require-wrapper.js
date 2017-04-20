'use strict';

const expect = require('chai').expect;
const vm = require('vm');

describe('registry : domain : require-wrapper', () => {

  const RequireWrapper = require('../../src/registry/domain/require-wrapper');

  describe('when using the require wrapper in a clear context', () => {

    describe('when requiring a dependency', () => {

      const dependencies = [
        'lodash'
      ];

      const context = {
        require: new RequireWrapper(dependencies),
        result: null
      };

      const script = 'var _ = require(\'lodash\');\n' +
                   'result = _.first([5, 4, 3, 2, 1]);';

      vm.runInNewContext(script, context);

      it('should correctly make the dependency require-able', () => {
        expect(context.result).to.eql(5);
      });
    });

    describe('when requiring an unrecognised dependency', () => {

      const dependencies = [];

      const context = {
        require: new RequireWrapper(dependencies),
        result: null
      };

      const script = 'var someModule = require(\'some-module\');\n' +
                   'result = someModule.someFunction(\'John Doe\');';

      it('should correctly throw an error', () => {
        expect(() => vm.runInNewContext(script, context)).to.throw({
          code: 'DEPENDENCY_MISSING_FROM_REGISTRY',
          missing: ['someModule']
        });
      });
    });

    describe('when requiring a dependency with a relative path', () => {

      const dependencies = [
        'lodash'
      ];

      const context = {
        require: new RequireWrapper(dependencies),
        result: null
      };

      const script = 'var _ = require(\'lodash/lodash\');\n' +
                   'result = _.first([5, 4, 3, 2, 1]);';

      vm.runInNewContext(script, context);

      it('should correctly make the dependency require-able', () => {
        expect(context.result).to.eql(5);
      });
    });

    describe('when requiring a dependency with a relative path that does not exist', () => {

      const dependencies = [
        'lodash'
      ];

      const context = {
        require: new RequireWrapper(dependencies),
        result: null
      };

      const script = 'var _ = require(\'lodash/foo\');\n' +
                   'result = _.first([5, 4, 3, 2, 1]);';

      it('should correctly throw an error', () => {
        expect(() => vm.runInNewContext(script, context)).to.throw({
          code: 'DEPENDENCY_MISSING_FROM_REGISTRY',
          missing: ['someModule']
        });
      });
    });
  });
});
