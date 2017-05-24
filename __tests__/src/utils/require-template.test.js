const requireTemplate = require('../../../src/utils/require-template');

describe('requireTemplate', () => {
  test('expect type of `requireTemplate` to be function', () => {
    expect(typeof requireTemplate).toBe('function');
  });

  describe('valid', () => {
    const scenarios = [
      { name: 'oc-template-handlebars' },
      { name: 'oc-template-jade' }
    ];

    scenarios.forEach(({ name }) => {
      test(name, () => {
        const template = requireTemplate(name);

        ['compile', 'getCompiledTemplate', 'getInfo', 'render']
          .forEach((method) => {
            expect(template).toHaveProperty(method);
          });
        expect(template).toMatchSnapshot();
      });
    });
  });

  describe('not valid', () => {
    const scenarios = [
      { name: 'lodash' },
      { name: 'oc-invalid-template' }
    ];

    scenarios.forEach(({ name }) => {
      test(name, () => {
        const sut = () => {
          requireTemplate(name);
        };

        expect(sut).toThrow();
        expect(sut).toThrowErrorMatchingSnapshot();
      });
    });
  });
});
