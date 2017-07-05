'use strict';

const expect = require('chai').expect;
const injectr = require('injectr');
const sinon = require('sinon');

describe('cli : domain : get-components-deps', () => {
  let error, result;
  const execute = readJsonStub => {
    const getComponentsDeps = injectr(
      '../../src/cli/domain/get-components-deps.js',
      {
        'builtin-modules': ['fs', 'url'],
        'fs-extra': {
          readJsonSync: readJsonStub
        },
        path: {
          join: (a, b) => `${a}/${b}`
        }
      }
    );

    try {
      result = getComponentsDeps([
        '/path/to/components/component1',
        '/path/to/components/component2'
      ]);
    } catch (e) {
      error = e;
    }
  };

  const baseOcFragment = templateType => ({
    files: { template: { type: templateType } }
  });

  describe('happy path', () => {
    before(() => {
      const readJsonStub = sinon.stub();

      readJsonStub.onFirstCall().returns({
        oc: baseOcFragment('jade'),
        dependencies: { lodash: '' }
      });

      readJsonStub.onSecondCall().returns({
        oc: baseOcFragment('handlebars'),
        dependencies: { underscore: '' }
      });

      execute(readJsonStub);
    });

    it('should return core dependencies + package depenndencies', () => {
      expect(result.modules.sort()).to.eql([
        'fs',
        'lodash',
        'underscore',
        'url'
      ]);
    });

    it('should return just package dependencies with versions', () => {
      expect(result.withVersions).to.eql(['lodash', 'underscore']);
    });

    it('should return no templates when using legacy templates', () => {
      expect(result.templates).to.eql([]);
    });
  });

  describe('custom templates and package dependencies with versions', () => {
    before(() => {
      const readJsonStub = sinon.stub();

      readJsonStub.onFirstCall().returns({
        oc: baseOcFragment('oc-template-react'),
        devDependencies: { 'oc-template-react-compiler': '1.2.3' }
      });

      readJsonStub.onSecondCall().returns({
        oc: baseOcFragment('handlebars'),
        dependencies: { underscore: '5.6.7' }
      });

      execute(readJsonStub);
    });

    it('should return core dependencies + package depenendencies', () => {
      expect(result.modules.sort()).to.eql(['fs', 'underscore', 'url']);
    });

    it('should return package dependencies with versions', () => {
      expect(result.withVersions).to.eql(['underscore@5.6.7']);
    });

    it('should return the custom templates', () => {
      expect(result.templates).to.eql(['oc-template-react']);
    });
  });

  describe('when custom template not correctly referenced in the package.json', () => {
    before(() => {
      const readJsonStub = sinon.stub();

      readJsonStub.onFirstCall().returns({
        oc: baseOcFragment('oc-template-handlebars')
      });

      readJsonStub.onSecondCall().returns({
        oc: baseOcFragment('handlebars'),
        dependencies: { underscore: '5.6.7' }
      });

      execute(readJsonStub);
    });

    it('should error', () => {
      expect(error.toString()).to.include(
        'Template dependency missing. To fix it run:\n\ncd'
      );
      expect(error.toString()).to.include(
        '&& npm install --save-dev oc-template-handlebars-compiler\n\n'
      );
    });
  });
});
