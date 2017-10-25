'use strict';

const _ = require('lodash');
const expect = require('chai').expect;
const injectr = require('injectr');
const sinon = require('sinon');

describe('cli : programmatic-api', () => {
  const deps = {
    './facade/dev': sinon.stub().returns(() => {}),
    './facade/init': sinon.stub().returns(() => {}),
    './facade/mock': sinon.stub().returns(() => {}),
    './facade/package': sinon.stub().returns(() => {}),
    './facade/publish': sinon.stub().returns(() => {}),
    './facade/preview': sinon.stub().returns(() => {}),
    './facade/registry-add': sinon.stub().returns(() => {}),
    './facade/registry-ls': sinon.stub().returns(() => {}),
    './facade/registry-remove': sinon.stub().returns(() => {})
  };
  const programmaticApi = injectr('../../src/cli/programmatic-api.js', deps);

  const scenarios = [
    { cmd: 'dev', facade: 'dev', dependencies: ['local', 'logger'] },
    { cmd: 'init', facade: 'init', dependencies: ['local', 'logger'] },
    { cmd: 'mock', facade: 'mock', dependencies: ['local', 'logger'] },
    { cmd: 'package', facade: 'package', dependencies: ['local', 'logger'] },
    {
      cmd: 'publish',
      facade: 'publish',
      dependencies: ['local', 'logger', 'registry']
    },
    {
      cmd: 'preview',
      facade: 'preview',
      dependencies: ['local', 'logger', 'registry']
    },
    {
      cmd: 'registry.add',
      facade: 'registry-add',
      dependencies: ['local', 'logger', 'registry']
    },
    {
      cmd: 'registry.ls',
      facade: 'registry-ls',
      dependencies: ['local', 'logger', 'registry']
    },
    {
      cmd: 'registry.remove',
      facade: 'registry-remove',
      dependencies: ['local', 'logger', 'registry']
    }
  ];

  scenarios.forEach(scenario => {
    describe(`cmd: cli.${scenario.cmd}`, () => {
      const fn = _.get(programmaticApi, scenario.cmd);

      it(`should be function`, () => {
        expect(typeof fn).to.equal('function');
        expect(fn.length).to.equal(2);
      });

      it(`should correctly wrap the related facade`, () => {
        fn({}, () => {});
        expect(deps[`./facade/${scenario.facade}`].args[0][0])
          .to.be.an('object')
          .that.has.all.keys(scenario.dependencies);
      });
    });
  });
});
