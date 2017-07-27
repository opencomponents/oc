'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const injectr = require('injectr');

describe('cli : domain : init-template', () => {
  describe('when invoking init-template', () => {
    describe('when the template is available in the dev registry', () => {
      const deps = {
        './scaffold': sinon.stub(),
        './install-template': sinon.stub().returnsArg(1),
        './create-component-dir': sinon.spy(),
        './init-package': sinon.spy(),
        path: {
          join: sinon.stub().onFirstCall().returnsArg(2)
        },
        'fs-extra': {
          stat: (path, cb) => cb(null, true)
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
        compiler: 'oc-template-jade-compiler',
        componentPath: 'path/to/myJadeComponent',
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
          componentPath: 'path/to/myJadeComponent'
        });
      });
      it('should correctly call scaffold', () => {
        expect(deps['./scaffold'].calledOnce).to.equal(true);
        expect(deps['./scaffold'].args[0][0]).to.deep.equal({
          compiler: 'oc-template-jade-compiler',
          compilerPath: 'oc-template-jade-compiler',
          logger: options.logger,
          componentPath: 'path/to/myJadeComponent',
          componentName: 'myJadeComponent',
          templateType: 'oc-template-jade'
        });
      });
      it('should not call initPackage', () => {
        expect(deps['./init-package'].notCalled).to.equal(true);
      });
      it('should not call installTemplate', () => {
        expect(deps['./install-template'].notCalled).to.equal(true);
      });
    });

    describe('when the template is not available in the dev registry', () => {
      const installTemplate = (options, cb) => {
        cb(null, 'foo');
      };
      const scaffold = sinon.spy();
      const deps = {
        './scaffold': scaffold,
        './install-template': sinon.spy(installTemplate),
        './create-component-dir': sinon.spy(),
        './init-package': sinon.spy(),
        './utils': { getPackageName: sinon.stub().returnsArg(0) },
        path: {
          join: sinon
            .stub()
            .onFirstCall()
            .returnsArg(2)
            .onSecondCall()
            .returnsArg(0)
        },
        'fs-extra': {
          stat: (path, cb) => cb(true)
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
        compiler: 'oc-template-hipster-compiler',
        componentName: 'supaComp',
        componentPath: 'path/to/supaComp',
        templateType: 'oc-template-hipster',
        logger: {
          log: sinon.spy()
        }
      };

      const result = initTemplate(options, () => {});

      it('should correctly call createComponentDir', () => {
        expect(deps['./create-component-dir'].calledOnce).to.equal(true);
        expect(deps['./create-component-dir'].args[0][0]).to.deep.equal({
          componentPath: 'path/to/supaComp'
        });
      });
      it('should correctly call initPackage', () => {
        expect(deps['./init-package'].calledOnce).to.equal(true);
        expect(deps['./init-package'].args[0][0].componentPath).to.equal(
          'path/to/supaComp'
        );
      });
      it('should correctly call installTemplate', () => {
        expect(deps['./install-template'].called).to.equal(true);
        expect(deps['./install-template'].args[0][0]).to.deep.equal({
          compiler: 'oc-template-hipster-compiler',
          compilerPath: 'path/to/supaComp',
          logger: options.logger,
          componentPath: 'path/to/supaComp',
          componentName: 'supaComp',
          templateType: 'oc-template-hipster'
        });
      });
      it('should call scaffold on installTemplate success', () => {
        expect(deps['./scaffold'].calledOnce).to.equal(true);
        expect(deps['./scaffold'].args[0][0]).to.deep.equal({
          compiler: 'oc-template-hipster-compiler',
          compilerPath: 'path/to/supaComp',
          logger: options.logger,
          componentPath: 'path/to/supaComp',
          componentName: 'supaComp',
          templateType: 'oc-template-hipster'
        });
      });
    });
  });
});
