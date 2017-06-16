'use strict';

const expect = require('chai').expect;

const requireTemplate = require('../../src/utils/require-template');

describe('utils : require-template', () => {
  it('expect type of `requireTemplate` to be function', () => {
    expect(typeof requireTemplate).to.equal('function');
  });

  describe('valid', () => {
    const scenarios = [
      { name: 'oc-template-handlebars' },
      { name: 'oc-template-jade' }
    ];

    scenarios.forEach(({ name }) => {
      it(name, () => {
        const template = requireTemplate(name);

        [
          'compile',
          'getCompiledTemplate',
          'getInfo',
          'render'
        ].forEach(method => {
          expect(template).to.have.property(method);
        });
      });
    });
  });

  describe('not valid', () => {
    const scenarios = [{ name: 'lodash' }, { name: 'oc-invalid-template' }];

    scenarios.forEach(({ name }) => {
      it(name, () => {
        const sut = () => {
          requireTemplate(name);
        };

        expect(sut).to.throw();
      });
    });
  });
});
