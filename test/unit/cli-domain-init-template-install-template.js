'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const injectr = require('injectr');

describe('cli : domain : init-template : install-template', () => {
  const npmUtils = { installDependency: sinon.stub() };
  const isTemplateValid = sinon.stub();
  const installTemplate = injectr(
    '../../dist/cli/domain/init-template/install-template.js',
    {
      '../../../utils/npm-utils': npmUtils,
      '../../../utils/is-template-valid': isTemplateValid,
      'try-require': sinon.stub().returns({
        getInfo: () => ({ version: '1.2.3' })
      })
    }
  ).default;

  describe('when succeeds', () => {
    const config = {
      templateType: 'oc-template-jade',
      componentPath: 'path/to/component',
      compiler: 'oc-template-jade-compiler',
      componentName: 'myComponent',
      logger: { log: sinon.spy() }
    };

    let error;
    let result;
    before(done => {
      const dest = 'path/to/component/node_modules/oc-template-jade-compiler';
      npmUtils.installDependency.reset();
      npmUtils.installDependency.resolves({ dest });
      isTemplateValid.returns(true);
      installTemplate(config)
        .then(res => (result = res))
        .catch(err => (error = err))
        .finally(done);
    });

    it('should spawn the right process', () => {
      expect(npmUtils.installDependency.args[0][0]).to.deep.equal({
        dependency: 'oc-template-jade-compiler',
        installPath: 'path/to/component',
        isDev: true,
        save: true
      });
    });

    it('should validate the template', () => {
      expect(isTemplateValid.called).to.be.true;
      expect(typeof isTemplateValid.args[0][0].getInfo).to.equal('function');
    });

    it('should return no error', () => {
      expect(error).to.be.undefined;
      expect(result).to.deep.equal({ ok: true });
    });

    it('should log progress and success', () => {
      expect(config.logger.log.args[0][0]).to.equal(
        'Installing oc-template-jade-compiler from npm...'
      );
      expect(config.logger.log.args[1][0]).to.contain(
        'Installed oc-template-jade-compiler [oc-template-jade v1.2.3]'
      );
    });
  });
});
