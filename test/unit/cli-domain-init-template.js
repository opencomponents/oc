'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const injectr = require('injectr');

describe('cli : domain : init-template', () => {
  let error;
  const initialise = stubs => cb => {
    const initTemplate = injectr(
      '../../src/cli/domain/init-template/index.js',
      {
        'fs-extra': {
          ensureDir: stubs.fsExtraStub
        },
        path: { join: (...args) => args.join('/') },
        './install-template': stubs.installTemplateStub,
        '../../../utils/npm-utils': {
          init: stubs.npmStub
        },
        './scaffold': stubs.scaffoldStub
      }
    );

    const options = {
      compiler: 'oc-template-react-compiler',
      componentName: 'new-component',
      componentPath: 'path/to/new-component',
      logger: { log: () => {} },
      templateType: 'oc-template-react'
    };

    initTemplate(options, err => {
      error = err;
      cb();
    });
  };

  describe('happy path', () => {
    const fsExtraStub = sinon.stub().yields(null, 'ok');
    const npmStub = sinon.stub().yields(null, 'ok');
    const installTemplateStub = sinon.stub().yields(null, 'ok');
    const scaffoldStub = sinon.stub().yields(null, 'ok');

    beforeEach(
      initialise({
        fsExtraStub,
        npmStub,
        installTemplateStub,
        scaffoldStub
      })
    );

    it('should return no error', () => {
      expect(error).to.be.null;
    });

    it('should call ensureDir with correct params', () => {
      expect(fsExtraStub.args[0][0]).to.equal('path/to/new-component');
    });

    it('should call npm init with correct parameters', () => {
      expect(npmStub.args[0][0]).to.deep.equal({
        initPath: 'path/to/new-component',
        silent: true
      });
    });

    it('should call installTemplate with correct parameters', () => {
      const o = installTemplateStub.args[0][0];
      expect(o.compiler).to.equal('oc-template-react-compiler');
      expect(o.componentPath).to.equal('path/to/new-component');
      expect(o.logger.log).to.be.a('function');
      expect(o.templateType).to.equal('oc-template-react');
    });

    it('should call scaffold with correct parameters', () => {
      const o = scaffoldStub.args[0][0];
      expect(o.compiler).to.equal('oc-template-react-compiler');
      expect(o.compilerPath).to.equal(
        'path/to/new-component/node_modules/oc-template-react-compiler'
      );
      expect(o.componentName).to.equal('new-component');
      expect(o.componentPath).to.equal('path/to/new-component');
      expect(o.templateType).to.equal('oc-template-react');
    });
  });

  describe('when component folder creation fails', () => {
    beforeEach(
      initialise({
        fsExtraStub: sinon.stub().yields('folder creation error')
      })
    );

    it('should return an error', () => {
      expect(error).to.equal('folder creation error');
    });
  });

  describe('when npm init fails', () => {
    beforeEach(
      initialise({
        fsExtraStub: sinon.stub().yields(null, 'ok'),
        npmStub: sinon.stub().yields('npm init failed')
      })
    );

    it('should return an error', () => {
      expect(error).to.equal('npm init failed');
    });
  });

  describe('when template compiler installation fails', () => {
    beforeEach(
      initialise({
        fsExtraStub: sinon.stub().yields(null, 'ok'),
        npmStub: sinon.stub().yields(null, 'ok'),
        installTemplateStub: sinon.stub().yields('npm install failed')
      })
    );

    it('should return an error', () => {
      expect(error).to.equal('npm install failed');
    });
  });

  describe('when template compiler installation fails', () => {
    beforeEach(
      initialise({
        fsExtraStub: sinon.stub().yields(null, 'ok'),
        npmStub: sinon.stub().yields(null, 'ok'),
        installTemplateStub: sinon.stub().yields(null, 'ok'),
        scaffoldStub: sinon.stub().yields('scaffolding failed')
      })
    );

    it('should return an error', () => {
      expect(error).to.equal('scaffolding failed');
    });
  });
});
