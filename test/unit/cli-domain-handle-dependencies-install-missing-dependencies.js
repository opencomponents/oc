'use strict';

const expect = require('chai').expect;
const injectr = require('injectr');
const sinon = require('sinon');

describe('cli : domain : handle-dependencies : install-missing-dependencies', () => {
  let error, logger;
  const initialise = (options, done) => {
    const { dependencies, stubs } = options;
    logger = {
      err: sinon.spy(),
      ok: sinon.spy(),
      warn: sinon.spy()
    };
    const installMissingDependencies = injectr(
      '../../src/cli/domain/handle-dependencies/install-missing-dependencies.js',
      {
        './get-missing-dependencies': stubs.getMissingDependencies,
        '../../../utils/npm-utils': {
          installDependencies: stubs.installDependencies
        },
        path: { resolve: () => '/path/to/oc-running' }
      }
    );

    const installOptions = { dependencies, logger };
    installMissingDependencies(installOptions, err => {
      error = err;
      done();
    });
  };

  describe('when there is no missing dependency', () => {
    let dependencies, stubs;
    beforeEach(done => {
      stubs = {
        getMissingDependencies: sinon.stub().returns([]),
        installDependencies: sinon.stub().yields(null)
      };

      dependencies = { lodash: '1.2.3' };
      initialise({ dependencies, stubs }, done);
    });

    it('should return no error', () => {
      expect(error).to.be.null;
    });

    it('should not install anything', () => {
      expect(stubs.installDependencies.called).to.be.false;
    });
  });

  describe('when there are missing dependencies and install succeeds', () => {
    let dependencies, stubs;

    beforeEach(done => {
      stubs = {
        getMissingDependencies: sinon.stub(),
        installDependencies: sinon.stub().yields(null)
      };

      stubs.getMissingDependencies
        .onCall(0)
        .returns(['lodash@1.2.3', 'underscore@latest']);
      stubs.getMissingDependencies.onCall(1).returns([]);

      dependencies = { lodash: '1.2.3', underscore: '' };
      initialise({ dependencies, stubs }, done);
    });

    it('should return no error', () => {
      expect(error).to.be.null;
    });

    it('should install the missing dependencies', () => {
      expect(stubs.installDependencies.args[0][0]).to.deep.equal({
        dependencies: ['lodash@1.2.3', 'underscore@latest'],
        installPath: '/path/to/oc-running',
        save: false,
        silent: true
      });
    });

    it('should log progress', () => {
      expect(logger.warn.args[0][0]).to.contain(
        'Trying to install missing modules: lodash@1.2.3, underscore@latest'
      );
      expect(logger.warn.args[0][0]).to.contain(
        "If you aren't connected to the internet, or npm isn't configured then this step will fail..."
      );
      expect(logger.ok.args[0][0]).to.equal('OK');
    });
  });

  describe('when there are missing dependencies and install fails', () => {
    let dependencies, stubs;

    beforeEach(done => {
      stubs = {
        getMissingDependencies: sinon.stub(),
        installDependencies: sinon.stub().yields('got an error')
      };

      stubs.getMissingDependencies
        .onCall(0)
        .returns(['lodash@1.2.3', 'underscore@latest']);
      stubs.getMissingDependencies.onCall(1).returns([]);

      dependencies = { lodash: '1.2.3', underscore: '' };
      initialise({ dependencies, stubs }, done);
    });

    it('should return the error', () => {
      expect(error).to.equal(
        'An error happened when installing the dependencies'
      );
    });

    it('should log progress', () => {
      expect(logger.warn.args[0][0]).to.contain(
        'Trying to install missing modules: lodash@1.2.3, underscore@latest'
      );
      expect(logger.warn.args[0][0]).to.contain(
        "If you aren't connected to the internet, or npm isn't configured then this step will fail..."
      );
      expect(logger.err.args[0][0]).to.equal('FAIL');
    });
  });

  describe('when there are missing dependencies and install succeeds but the dependencies are still not requireable', () => {
    let dependencies, stubs;

    beforeEach(done => {
      stubs = {
        getMissingDependencies: sinon.stub(),
        installDependencies: sinon.stub().yields(null)
      };

      stubs.getMissingDependencies.returns([
        'lodash@1.2.3',
        'underscore@latest'
      ]);

      dependencies = { lodash: '1.2.3', underscore: '' };
      initialise({ dependencies, stubs }, done);
    });

    it('should return the error', () => {
      expect(error).to.equal(
        'An error happened when installing the dependencies'
      );
    });

    it('should log progress', () => {
      expect(logger.warn.args[0][0]).to.contain(
        'Trying to install missing modules: lodash@1.2.3, underscore@latest'
      );
      expect(logger.warn.args[0][0]).to.contain(
        "If you aren't connected to the internet, or npm isn't configured then this step will fail..."
      );
      expect(logger.err.args[0][0]).to.equal('FAIL');
    });
  });
});
