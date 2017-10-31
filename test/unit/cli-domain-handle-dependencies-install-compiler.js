'use strict';

const expect = require('chai').expect;
const injectr = require('injectr');
const sinon = require('sinon');

describe('cli : domain : handle-dependencies : install-compiler', () => {
  let cleanRequireStub, installDependencyMock, isTemplateValidStub, loggerMock;
  let error, result;

  const initialise = (options, done) => {
    cleanRequireStub = sinon.stub().returns({ theCompiler: true });
    installDependencyMock = sinon
      .stub()
      .yields(options.shouldInstallFail ? 'install error' : null);
    isTemplateValidStub = sinon.stub().returns(!options.shouldValidationFail);
    loggerMock = {
      err: sinon.stub(),
      ok: sinon.stub(),
      warn: sinon.stub()
    };

    const installOptions = {
      compilerPath: '/path/to/components/component/node_modules/',
      componentName: 'component',
      componentPath: '/path/to/components/component/',
      dependency: 'oc-template-react-compiler@1.2.3',
      logger: loggerMock
    };

    const installCompiler = injectr(
      '../../src/cli/domain/handle-dependencies/install-compiler.js',
      {
        '../../../utils/clean-require': cleanRequireStub,
        '../../../utils/is-template-valid': isTemplateValidStub,
        '../../../utils/npm-utils': { installDependency: installDependencyMock }
      }
    );

    installCompiler(installOptions, (err, compiler) => {
      error = err;
      result = compiler;
      done();
    });
  };

  describe('when succeeds', () => {
    beforeEach(done => initialise({}, done));

    it('should run npm install with correct parameters', () => {
      expect(installDependencyMock.args[0][0]).to.deep.equal({
        dependency: 'oc-template-react-compiler@1.2.3',
        installPath: '/path/to/components/component/',
        save: false,
        silent: true
      });
    });

    it('should return no error', () => {
      expect(error).to.be.null;
    });

    it('should return the compiler', () => {
      expect(result).to.deep.equal({ theCompiler: true });
    });

    it('should log progress', () => {
      expect(loggerMock.warn.args[0][0]).to.contain(
        `Trying to install missing modules: oc-template-react-compiler@1.2.3`
      );
      expect(loggerMock.warn.args[0][0]).to.contain(
        "If you aren't connected to the internet, or npm isn't configured then this step will fail..."
      );
      expect(loggerMock.ok.args[0][0]).to.equal('OK');
    });
  });

  describe('when install fails', () => {
    beforeEach(done => initialise({ shouldInstallFail: true }, done));

    it('should return an error', () => {
      expect(error).to.be.equal(
        'There was a problem while installing the compiler'
      );
    });

    it('should log progress', () => {
      expect(loggerMock.warn.args[0][0]).to.contain(
        `Trying to install missing modules: oc-template-react-compiler@1.2.3`
      );
      expect(loggerMock.warn.args[0][0]).to.contain(
        "If you aren't connected to the internet, or npm isn't configured then this step will fail..."
      );
      expect(loggerMock.err.args[0][0]).to.equal('FAIL');
    });
  });

  describe('when install succeeds but validation fails', () => {
    beforeEach(done => initialise({ shouldValidationFail: true }, done));

    it('should return an error', () => {
      expect(error).to.be.equal(
        'There was a problem while installing the compiler'
      );
    });

    it('should log progress', () => {
      expect(loggerMock.warn.args[0][0]).to.contain(
        `Trying to install missing modules: oc-template-react-compiler@1.2.3`
      );
      expect(loggerMock.warn.args[0][0]).to.contain(
        "If you aren't connected to the internet, or npm isn't configured then this step will fail..."
      );
      expect(loggerMock.ok.args[0][0]).to.equal('OK');
    });
  });
});
