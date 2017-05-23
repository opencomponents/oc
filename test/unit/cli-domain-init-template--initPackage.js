'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const injectr = require('injectr');


const deps = {
  'cross-spawn': {
    sync: sinon.spy()
  }
};

const initPackage = injectr('../../src/cli/domain/init-template/initPackage.js', deps, {});

describe('cli : domain : init-template initPackage', () => {
  describe('when invoked', () => {
    const config = {
      componentPath: 'path/to/component',
      cli: 'npm'
    };

    initPackage(config);

    it('should spawn the right process', () => {
      expect(deps['cross-spawn'].sync.calledWith(
        'npm',
        ['init', "--yes"],
        {"cwd": "path/to/component", "silent": true}
      )).to.equal(true);
    });
  });
});
