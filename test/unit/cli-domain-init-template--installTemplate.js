'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const injectr = require('injectr');

const proc = sinon.stub();
const deps = {
  'cross-spawn': sinon.stub().returns({
    on: proc
  }),
  'colors/safe': sinon.spy(),
  'cli-spinner': {
    Spinner: sinon.stub().returns({
      start: sinon.spy(),
      stop: sinon.spy()
    })
  }
};

const installTemplate = injectr('../../src/cli/domain/init-template/installTemplate.js', deps, {});

describe('cli : domain : init-template installTemplate', () => {
  describe('when invoked', () => {
    const config = {
      templateType: 'oc-template-jade',
      cli: 'npm',
      componentPath: 'path/to/component',
      local: true,
      packageName: 'myComponent',
      logger: {
        log: sinon.spy()
      }
    };
    const callback = sinon.spy();

    installTemplate(config, callback);

    it('should spawn the right process', () => {
      expect(deps['cross-spawn'].calledWith(
        'npm',
        ['install', "--save", "--save-exact", "oc-template-jade"],
        {"cwd": "path/to/component", "silent": true}
      )).to.equal(true);
    });
    it('should correctly start the spinner', () => {
      expect(deps['cli-spinner'].Spinner.args[0][0]).to.equal('Installing myComponent from local...');
    });
    it('should correctly setup on error and on close listeners', () => {
      expect(proc.args[0][0]).to.equal('error');
      expect(proc.args[1][0]).to.equal('close');
    });
  });
});
