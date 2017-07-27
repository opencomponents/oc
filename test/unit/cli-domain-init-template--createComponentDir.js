'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const injectr = require('injectr');

const deps = {
  'fs-extra': {
    ensureDirSync: sinon.spy()
  }
};

const createComponentDir = injectr(
  '../../src/cli/domain/init-template/create-component-dir.js',
  deps,
  {}
);

describe('cli : domain : init-template createComponentDir', () => {
  describe('when invoked', () => {
    const config = {
      componentPath: 'path/to/component',
      packageName: 'myComponent',
      logger: {
        log: sinon.spy()
      }
    };

    createComponentDir(config);

    it('should correctly invoke ensureDirSync', () => {
      expect(
        deps['fs-extra'].ensureDirSync.calledWith('path/to/component')
      ).to.equal(true);
    });
  });
});
