'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const injectr = require('injectr');

describe('cli : domain : init-template', () => {
  describe('when invoking init-template', () => {
    describe('when the template is available in the dev registry', () => {
      const deps = {
        './scaffold': sinon.stub().returnsArg(0),
        './install-template': sinon.stub().returnsArg(1),
        './create-component-dir': sinon.spy(),
        './init-package': sinon.spy(),
        './utils': { getPackageName: sinon.stub().returnsArg(0) },
        path: {
          join: sinon
            .stub()
            .onFirstCall()
            .returnsArg(1)
            .onSecondCall()
            .returnsArg(2),
          resolve: sinon.stub().returnsArg(2)
        }
      };

      const globals = {
        process: {
          cwd: () => ''
        }
      };

      const initTemplate = injectr(
        '../../src/cli/domain/init-template/index.js',
        deps,
        globals
      );

      const options = {
        componentName: 'myJadeComponent',
        templateType: 'oc-template-jade',
        logger: {
          log: sinon.spy()
        }
      };

      const result = initTemplate(options, () => {});

      it('should correctly call createComponentDir', () => {
        expect(deps['./create-component-dir'].calledOnce).to.equal(true);
        expect(deps['./create-component-dir'].args[0][0]).to.deep.equal({
          logger: options.logger,
          componentName: 'myJadeComponent',
          componentPath: 'myJadeComponent'
        });
      });
      it('should correctly call scaffold', () => {
        expect(deps['./scaffold'].calledOnce).to.equal(true);
        expect(deps['./scaffold'].args[0][0].compilerPath).to.equal(
          'oc-template-jade-compiler'
        );
        expect(deps['./scaffold'].args[0][0].compilerPath).to.equal(
          'oc-template-jade-compiler'
        );
        expect(deps['./scaffold'].args[0][0].componentName).to.equal(
          'myJadeComponent'
        );
        expect(deps['./scaffold'].args[0][0].componentPath).to.equal(
          'myJadeComponent'
        );
      });
      it('should not call initPackage', () => {
        expect(deps['./init-package'].notCalled).to.equal(true);
      });
      it('should not call installTemplate', () => {
        expect(deps['./install-template'].notCalled).to.equal(true);
      });
      it('should correctly return', () => {
        expect(result.componentName).to.equal('myJadeComponent');
      });
    });

    describe('when the template is not available in the dev registry', () => {
      const deps = {
        './scaffold': sinon.stub().returnsArg(1),
        './install-template': sinon.stub().returnsArg(1),
        './create-component-dir': sinon.spy(),
        './init-package': sinon.spy(),
        './utils': { getPackageName: sinon.stub().returnsArg(0) },
        path: {
          join: sinon
            .stub()
            .onFirstCall()
            .returnsArg(1)
            .onSecondCall()
            .returnsArg(2),
          resolve: sinon.stub().returnsArg(1)
        }
      };

      const globals = {
        process: {
          cwd: () => ''
        },
        require: sinon.stub().returns(true)
      };

      const initTemplate = injectr(
        '../../src/cli/domain/init-template/index.js',
        deps,
        globals
      );

      const options = {
        componentName: 'supaComp',
        templateType: 'oc-template-hispter',
        logger: {
          log: sinon.spy()
        }
      };

      const result = initTemplate(options, () => {});

      it('should correctly call createComponentDir', () => {
        expect(deps['./create-component-dir'].calledOnce).to.equal(true);
        expect(deps['./create-component-dir'].args[0][0]).to.deep.equal({
          logger: options.logger,
          componentName: 'supaComp',
          componentPath: 'supaComp'
        });
      });
      it('should correctly call initPackage', () => {
        expect(deps['./init-package'].calledOnce).to.equal(true);
        expect(deps['./init-package'].args[0][0].componentPath).to.equal(
          'supaComp'
        );
        expect(deps['./init-package'].args[0][0].cli).to.equal('npm');
      });
      it('should correctly call installTemplate', () => {
        expect(deps['./install-template'].called).to.equal(true);
        expect(deps['./install-template'].args[0][0].componentPath).to.equal(
          'supaComp'
        );
        expect(deps['./install-template'].args[0][0].template).to.equal(
          'oc-template-hispter'
        );
        expect(deps['./install-template'].args[0][0].compiler).to.equal(
          'oc-template-hispter-compiler'
        );
        expect(deps['./install-template'].args[0][0].cli).to.equal('npm');
        expect(deps['./install-template'].args[0][0].logger.log).to.equal(
          options.logger.log
        );
      });
      it('should not directly call scaffold', () => {
        expect(deps['./scaffold'].notCalled).to.equal(true);
      });
      it('should correctly return', () => {
        expect(result).to.equal(deps['./scaffold']);
      });
    });
  });
});
