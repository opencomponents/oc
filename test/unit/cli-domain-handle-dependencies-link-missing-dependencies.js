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
    const linkMissingDependencies = injectr(
      '../../src/cli/domain/handle-dependencies/link-missing-dependencies.js',
      {
        './get-missing-dependencies': stubs.getMissingDependencies,
        'fs-extra': { ensureSymlinkSync: stubs.ensureSymlinkSync },
        path: { resolve: () => '/path/to/oc-running' }
      }
    );

    const installOptions = {
      componentPath: '/path/to/oc-component',
      dependencies,
      logger
    };
    linkMissingDependencies(installOptions, err => {
      error = err;
      done();
    });
  };

  describe('when there is no missing dependency', () => {
    let dependencies, stubs;
    beforeEach(done => {
      stubs = {
        getMissingDependencies: sinon.stub().returns([]),
        ensureSymlinkSync: sinon
          .stub()
          .onCall()
          .yields(null)
      };

      dependencies = { lodash: '1.2.3' };
      initialise({ dependencies, stubs }, done);
    });

    it('should return no error', () => {
      expect(error).to.be.null;
    });

    it('should not install anything', () => {
      expect(stubs.ensureSymlinkSync.called).to.be.false;
    });
  });

  describe('when there are missing dependencies and link succeeds', () => {
    let dependencies, stubs;

    beforeEach(done => {
      stubs = {
        getMissingDependencies: sinon.stub(),
        ensureSymlinkSync: sinon
          .stub()
          .onCall()
          .yields(null)
      };

      stubs.getMissingDependencies
        .onCall(0)
        .returns(['lodash@1.2.3', 'underscore@latest']);

      dependencies = { lodash: '1.2.3', underscore: '' };
      initialise({ dependencies, stubs }, done);
    });

    it('should return no error', () => {
      expect(error).to.be.null;
    });

    it('should symlink the missing dependencies', () => {
      expect(stubs.ensureSymlinkSync.args[0][0]).to.deep.equal(
        '/path/to/oc-running',
        '/path/to/oc-running',
        'dir'
      );
    });

    it('should log progress', () => {
      expect(logger.warn.args[0][0]).to.contain(
        'Trying to link missing modules: lodash@1.2.3, underscore@latest'
      );
    });
  });

  describe('when there are missing dependencies and link fails', () => {
    let dependencies, stubs;

    beforeEach(done => {
      stubs = {
        getMissingDependencies: sinon.stub(),
        ensureSymlinkSync: sinon.stub().throws(new Error('symlink error'))
      };

      stubs.getMissingDependencies
        .onCall(0)
        .returns(['lodash@1.2.3', 'underscore@latest']);

      dependencies = { lodash: '1.2.3', underscore: '' };
      initialise({ dependencies, stubs }, done);
    });

    it('should return the error', () => {
      expect(error).to.equal('An error happened when linking the dependencies');
    });

    it('should log progress', () => {
      expect(logger.warn.args[0][0]).to.contain(
        'Trying to link missing modules: lodash@1.2.3, underscore@latest'
      );
      expect(logger.err.args[0][0]).to.equal(
        'An error happened when linking the dependency lodash with error Error: symlink error'
      );
    });
  });
});
