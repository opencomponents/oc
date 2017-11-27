'use strict';

const expect = require('chai').expect;
const injectr = require('injectr');
const sinon = require('sinon');
const _ = require('lodash');

describe('cli : domain : handle-dependencies - get-missing-dependencies', () => {
  const scenarios = [
    {
      dependencies: { lodash: '1.2.3', underscore: '' },
      installed: { lodash: true, underscore: false },
      output: ['underscore@latest']
    },
    {
      dependencies: { lodash: '1.2.3', underscore: '4.5.6' },
      installed: { lodash: true, underscore: false },
      output: ['underscore@4.5.6']
    },
    {
      dependencies: { lodash: '1.2.3', underscore: '' },
      installed: { lodash: true, underscore: true },
      output: []
    }
  ];

  scenarios.forEach(scenario => {
    const { dependencies, installed, output } = scenario;
    describe(`When dependencies: ${JSON.stringify(
      dependencies
    )} and installed: ${JSON.stringify(installed)}`, () => {
      const pathResolveSpy = sinon.spy();
      const cleanRequireSpy = sinon.spy();
      const getMissingDependencies = injectr(
        '../../src/cli/domain/handle-dependencies/get-missing-dependencies.js',
        {
          '../../../utils/clean-require': (name, options) => {
            cleanRequireSpy(name, options);
            return installed[name] ? { dependency: true } : undefined;
          },
          path: {
            resolve: (...args) => {
              pathResolveSpy(...args);
              return args[args.length - 1];
            }
          }
        }
      );

      it(`should output ${JSON.stringify(output)}`, () => {
        expect(getMissingDependencies(dependencies)).to.deep.equal(output);
      });

      it('should resolve the dependency relative to where the oc cli is running', () => {
        pathResolveSpy.args.forEach((pathResolveCall, i) => {
          expect(pathResolveCall[0]).to.equal('node_modules/');
          expect(pathResolveCall[1]).to.equal(_.keys(dependencies)[i]);
        });
        cleanRequireSpy.args.forEach((cleanRequireCall, i) => {
          expect(cleanRequireCall[0]).to.equal(_.keys(dependencies)[i]);
          expect(cleanRequireCall[1]).to.eql({
            justTry: true,
            resolve: true
          });
        });
      });
    });
  });
});
