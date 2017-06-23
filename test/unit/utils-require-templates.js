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

    scenarios.forEach(scenario => {
      it(scenario.name, () => {
        const template = requireTemplate(scenario.name, { compiler: true });

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

    scenarios.forEach(scenario => {
      it(scenario.name, () => {
        const sut = () => {
          requireTemplate(scenario.name);
        };

        expect(sut).to.throw();
      });
    });
  });
});
