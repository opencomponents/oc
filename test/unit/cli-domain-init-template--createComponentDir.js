'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const injectr = require('injectr');

const start = sinon.spy();
const stop = sinon.spy();

const deps = {
  'fs-extra': {
    ensureDirSync: sinon.spy()
  },
  'colors/safe': {
    green: sinon.stub().returnsArg(0)
  },
  'cli-spinner': {
    Spinner: sinon.stub().returns({
      start,
      stop
    })
  }
};

const createComponentDir = injectr('../../src/cli/domain/init-template/createComponentDir.js', deps, {});

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

    it('should correctly start and stop the spinner', () => {
      expect(deps['cli-spinner'].Spinner.args[0][0]).to.equal('Creating directory...');
      expect(start.calledOnce).to.equal(true);
      expect(stop.calledOnce).to.equal(true);
    });
    it('should correctly invoke ensureDirSync', () => {
      expect(deps['fs-extra'].ensureDirSync.calledWith(
        config.componentPath
      )).to.equal(true);
    });
    it('should correctly log to the provided logger', () => {
      expect(config.logger.log.calledWith(`✔ Created directory "${config.componentName}"`)).to.equal(true);
    });
  });
});
