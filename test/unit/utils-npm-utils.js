'use strict';

const expect = require('chai').expect;
const injectr = require('injectr');
const sinon = require('sinon');

describe('utils : npm-utils', () => {
  const crossSpawnStub = sinon.stub();

  const npmUtils = injectr('../../src/utils/npm-utils.js', {
    'cross-spawn': crossSpawnStub,
    path: { join: (...items) => items.join('/') }
  });

  const installPath = 'path/to/component';

  const scenarios = [
    {
      input: {
        dependency: 'oc-template-jade-compiler',
        installPath,
        isDev: true,
        save: true
      },
      output: [
        'install',
        '--save-exact',
        '--save-dev',
        'oc-template-jade-compiler'
      ]
    },
    {
      input: {
        dependency: 'lodash',
        installPath,
        isDev: true,
        save: false
      },
      output: ['install', 'lodash']
    },
    {
      input: {
        dependency: 'underscore',
        installPath,
        isDev: false,
        save: true
      },
      output: ['install', '--save-exact', '--save', 'underscore']
    }
  ];

  scenarios.forEach(scenario => {
    const dependency = scenario.input.dependency;
    describe(`when invoked for installing ${dependency}`, () => {
      let error, result, onStub;
      beforeEach(done => {
        onStub = sinon.stub();
        crossSpawnStub.reset();
        crossSpawnStub.returns({ on: onStub });
        npmUtils.installDependency(scenario.input, (err, res) => {
          error = err;
          result = res;
          done();
        });
        onStub.args[1][1](0);
      });

      it('should spawn the process with correct parameters', () => {
        expect(crossSpawnStub.args[0][0]).to.equal('npm');
        expect(crossSpawnStub.args[0][1]).to.deep.equal(scenario.output);
      });

      it('should return no error', () => {
        expect(error).to.be.null;
      });

      it('should return the installation path', () => {
        expect(result).to.deep.equal({
          dest: `path/to/component/node_modules/${dependency}`
        });
      });

      it('should correctly setup on error and on close listeners', () => {
        expect(onStub.args[0][0]).to.equal('error');
        expect(onStub.args[1][0]).to.equal('close');
      });
    });
  });
});
