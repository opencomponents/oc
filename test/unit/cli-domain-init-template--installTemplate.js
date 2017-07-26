'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const injectr = require('injectr');

const proc = sinon.stub();
const deps = {
  'cross-spawn': sinon.stub().returns({
    on: proc
  })
};

const installTemplate = injectr(
  '../../src/cli/domain/init-template/install-template.js',
  deps,
  {}
);
describe('cli : domain : init-template installTemplate', () => {
  describe('when invoked', () => {
    const config = {
      templateType: 'oc-template-jade',
      componentPath: 'path/to/component',
      compiler: 'oc-template-jade-compiler',
      componentName: 'myComponent',
      logger: {
        log: sinon.spy()
      }
    };
    const callback = sinon.spy();

    installTemplate(config, callback);

    it('should spawn the right process', () => {
      expect(deps['cross-spawn'].args[0][0]).to.equal('npm');
      expect(deps['cross-spawn'].args[0][1]).to.deep.equal([
        'install',
        '--save-dev',
        '--save-exact',
        'oc-template-jade-compiler'
      ]);
    });
    it('should correctly setup on error and on close listeners', () => {
      expect(proc.args[0][0]).to.equal('error');
      expect(proc.args[1][0]).to.equal('close');
    });
  });
});
