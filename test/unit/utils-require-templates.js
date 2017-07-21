'use strict';

const expect = require('chai').expect;

const requireTemplate = require('../../src/utils/require-template');

describe('utils : require-template', () => {
  it('expect type of `requireTemplate` to be function', () => {
    expect(typeof requireTemplate).to.equal('function');
  });

  describe('valid', () => {
    const scenarios = [
      { name: 'oc-template-handlebars', compiler: true },
      { name: 'oc-template-jade', compiler: false },
      { name: 'oc-template-jade' }
    ];

    scenarios.forEach(scenario => {
      it(scenario.name, () => {
        const template = requireTemplate(scenario.name, {
          compiler: scenario.compiler
        });
        let api = ['getCompiledTemplate', 'getInfo', 'render'];
        if (scenario.compiler) {
          api = api.concat('compile');
        }

        api.forEach(method => {
          expect(template).to.have.property(method);
        });
      });
    });
  });

  describe('not valid', () => {
    const scenarios = [{ name: 'lodash' }, { name: 'oc-invalid-template' }];

    scenarios.forEach(scenario => {
      it(scenario.name, () => {
        expect(() => requireTemplate(scenario.name)).to.throw();
      });
    });
  });
});
