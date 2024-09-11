const expect = require('chai').expect;
const sinon = require('sinon');
const injectr = require('injectr');

describe('cli : domain : init-template', () => {
  let error;
  const initialise = (stubs) => (cb) => {
    const initTemplate = injectr(
      '../../dist/cli/domain/init-template/index.js',
      {
        'node:fs/promises': {
          mkdir: stubs.fsStub
        },
        'node:path': { join: (...args) => args.join('/') },
        './install-template': stubs.installTemplateStub,
        '../../../utils/npm-utils': {
          init: stubs.npmStub,
          installDependencies: stubs.npmStub
        },
        './scaffold': stubs.scaffoldStub
      }
    ).default;

    const options = {
      compiler: 'oc-template-react-compiler',
      componentName: 'new-component',
      componentPath: 'path/to/new-component',
      logger: { log: () => {} },
      templateType: 'oc-template-react'
    };

    initTemplate(options)
      .catch((err) => {
        error = err;
      })
      .finally(cb);
  };

  describe('happy path', () => {
    const fsStub = sinon.stub().resolves('ok');
    const npmStub = sinon.stub().resolves('ok');
    const installTemplateStub = sinon.stub().resolves('ok');
    const scaffoldStub = sinon.stub().resolves('ok');

    beforeEach(
      initialise({
        fsStub,
        npmStub,
        installTemplateStub,
        scaffoldStub
      })
    );

    it('should return no error', () => {
      expect(error).to.be.undefined;
    });

    it('should call ensureDir with correct params', () => {
      expect(fsStub.args[0][0]).to.equal('path/to/new-component');
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

    it('should call npm install with correct parameters', () => {
      expect(npmStub.args[1][0]).to.deep.equal({
        installPath: 'path/to/new-component',
        silent: true,
        usePrefix: true
      });
    });
  });

  describe('when component folder creation fails', () => {
    beforeEach(
      initialise({
        fsStub: sinon.stub().rejects(new Error('folder creation error'))
      })
    );

    it('should return an error', () => {
      expect(error.message).to.equal('folder creation error');
    });
  });

  describe('when npm init fails', () => {
    beforeEach(
      initialise({
        fsStub: sinon.stub().resolves('ok'),
        npmStub: sinon.stub().rejects(new Error('npm init failed'))
      })
    );

    it('should return an error', () => {
      expect(error.message).to.equal('npm init failed');
    });
  });

  describe('when template compiler installation fails', () => {
    beforeEach(
      initialise({
        fsStub: sinon.stub().resolves('ok'),
        npmStub: sinon.stub().resolves('ok'),
        installTemplateStub: sinon
          .stub()
          .rejects(new Error('npm install failed'))
      })
    );

    it('should return an error', () => {
      expect(error.message).to.equal('npm install failed');
    });
  });

  describe('when template compiler installation fails', () => {
    beforeEach(
      initialise({
        fsStub: sinon.stub().resolves('ok'),
        npmStub: sinon.stub().resolves('ok'),
        installTemplateStub: sinon.stub().resolves('ok'),
        scaffoldStub: sinon.stub().rejects(new Error('scaffolding failed'))
      })
    );

    it('should return an error', () => {
      expect(error.message).to.equal('scaffolding failed');
    });
  });
});
