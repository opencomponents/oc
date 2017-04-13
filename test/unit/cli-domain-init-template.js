'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const injectr = require('injectr');

describe('cli : domain : init-template', () => {
  describe('when invoking init-template', () => {
    describe('when the template is available in the dev registry', () => {
      const deps = {
        './blueprint': sinon.stub().returnsArg(0),
        './installTemplate': sinon.stub().returnsArg(1),
        './createComponentDir': sinon.spy(),
        './initPackage': sinon.spy(),
        './utils': { getPackageName : sinon.stub().returnsArg(0) },
        'path': {
          join: sinon.stub().returnsArg(1),
          resolve: sinon.stub().returnsArg(1)
        }
      };

      const globals = {
        process: {
          cwd: () => ''
        }
      };

      const initTemplate = injectr('../../src/cli/domain/init-template/index.js', deps, globals);

      const options = {
        logger: {
          log: sinon.spy()
        }
      };

      const result = initTemplate('myJadeComponent', 'oc-template-jade', options, () => {});

      it('should correctly call createComponentDir', () => {
        expect(deps['./createComponentDir'].calledOnce).to.equal(true);
        expect(deps['./createComponentDir'].args[0][0].componentPath).to.equal('myJadeComponent');
        expect(deps['./createComponentDir'].args[0][0].packageName).to.equal('oc-template-jade');
        expect(deps['./createComponentDir'].args[0][0].cli).to.equal('npm');
        expect(deps['./createComponentDir'].args[0][0].logger.log).to.equal(options.logger.log);
      });
      it('should correctly call blueprint', () => {
        expect(deps['./blueprint'].calledOnce).to.equal(true);
        expect(deps['./blueprint'].args[0][0].templatePath).to.equal('oc-template-jade');
      });
      it('should not call initPackage', () => {
        expect(deps['./initPackage'].notCalled).to.equal(true);
      });
      it('should not call installTemplate', () => {
        expect(deps['./installTemplate'].notCalled).to.equal(true);
      });
      it('should correctly return', () => {
        expect(result.cli).to.equal('npm');
      });
    });

    describe('when the template is not available in the dev registry', () => {
      const deps = {
        './blueprint': sinon.stub().returnsArg(1),
        './installTemplate': sinon.stub().returnsArg(1),
        './createComponentDir': sinon.spy(),
        './initPackage': sinon.spy(),
        './utils': { getPackageName : sinon.stub().returnsArg(0) },
        'path': {
          join: sinon.stub().returnsArg(1),
          resolve: sinon.stub().returnsArg(1)
        }
      };

      const globals = {
        process: {
          cwd: () => ''
        },
        require: sinon.stub().returns(true)
      };

      const initTemplate = injectr('../../src/cli/domain/init-template/index.js', deps, globals);

      const options = {
        logger: {
          log: sinon.spy()
        }
      };

      const result = initTemplate('supaComp', 'oc-template-hispter', options, () => {});

      it('should correctly call createComponentDir', () => {
        expect(deps['./createComponentDir'].calledOnce).to.equal(true);
        expect(deps['./createComponentDir'].args[0][0].componentPath).to.equal('supaComp');
        expect(deps['./createComponentDir'].args[0][0].packageName).to.equal('oc-template-hispter');
        expect(deps['./createComponentDir'].args[0][0].cli).to.equal('npm');
        expect(deps['./createComponentDir'].args[0][0].logger.log).to.equal(options.logger.log);
      });
      it('should correctly call initPackage', () => {
        expect(deps['./initPackage'].calledOnce).to.equal(true);
        expect(deps['./initPackage'].args[0][0].componentPath).to.equal('supaComp');
        expect(deps['./initPackage'].args[0][0].packageName).to.equal('oc-template-hispter');
        expect(deps['./initPackage'].args[0][0].cli).to.equal('npm');
        expect(deps['./initPackage'].args[0][0].logger.log).to.equal(options.logger.log);
      });
      it('should correctly call installTemplate', () => {
        expect(deps['./installTemplate'].called).to.equal(true);
        expect(deps['./installTemplate'].args[0][0].componentPath).to.equal('supaComp');
        expect(deps['./installTemplate'].args[0][0].packageName).to.equal('oc-template-hispter');
        expect(deps['./installTemplate'].args[0][0].cli).to.equal('npm');
        expect(deps['./installTemplate'].args[0][0].logger.log).to.equal(options.logger.log);
      });
      it('should not directly call bluprint', () => {
        expect(deps['./blueprint'].notCalled).to.equal(true);
      });
      it('should correctly return', () => {
        expect(result).to.equal(deps['./blueprint']);
      });
    });
  });
});
