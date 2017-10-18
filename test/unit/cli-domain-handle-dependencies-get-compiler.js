'use strict';

const expect = require('chai').expect;
const injectr = require('injectr');
const sinon = require('sinon');
const _ = require('lodash');

describe('cli : domain : handle-dependencies : get-compiler', () => {
  let cleanRequireStub, error, installCompilerStub, result;
  const execute = (opts, done) => {
    done = done || opts;
    const compilerVersion = opts.compilerVersionEmpty ? '' : '1.2.3';
    const options = {
      compilerDep: 'oc-template-handlebars-compiler',
      componentPath: '/path/to/component',
      logger: {},
      pkg: {
        name: 'my-component',
        devDependencies: {
          'oc-template-handlebars-compiler': compilerVersion
        }
      }
    };

    const getCompiler = injectr(
      '../../src/cli/domain/handle-dependencies/get-compiler.js',
      {
        path: { join: (...args) => args.join('/') },
        '../../../utils/clean-require': cleanRequireStub,
        './install-compiler': installCompilerStub
      }
    );

    getCompiler(_.cloneDeep(options), (err, res) => {
      error = err;
      result = res;
      done();
    });
  };

  describe("when compiler is already installed inside the component's folder", () => {
    beforeEach(done => {
      installCompilerStub = sinon.stub().yields(null, { ok: true });
      cleanRequireStub = sinon.stub().returns({ thisIsACompiler: true });
      execute(done);
    });

    it("should try to require it from the component's path", () => {
      expect(cleanRequireStub.args[0][0]).to.equal(
        '/path/to/component/node_modules/oc-template-handlebars-compiler'
      );
    });

    it('should return no error', () => {
      expect(error).to.be.null;
    });

    it('should not try to install it', () => {
      expect(installCompilerStub.called).to.be.false;
    });
  });

  describe("when compiler is not installed inside the component's folder", () => {
    describe('when compiler version is specified', () => {
      beforeEach(done => {
        installCompilerStub = sinon.stub().yields(null, { ok: true });
        cleanRequireStub = sinon.stub().returns(undefined);

        execute(done);
      });

      it('should return no error', () => {
        expect(error).to.be.null;
      });

      it('should install it', () => {
        expect(installCompilerStub.args[0][0]).to.deep.equal({
          compilerPath:
            '/path/to/component/node_modules/oc-template-handlebars-compiler',
          componentName: 'my-component',
          componentPath: '/path/to/component',
          dependency: 'oc-template-handlebars-compiler@1.2.3',
          logger: {}
        });
      });
    });

    describe('when compiler version is not specified', () => {
      beforeEach(done => {
        installCompilerStub = sinon.stub().yields(null, { ok: true });
        cleanRequireStub = sinon.stub().returns(undefined);
        execute({ compilerVersionEmpty: true }, done);
      });

      it('should return no error', () => {
        expect(error).to.be.null;
      });

      it('should install it', () => {
        expect(installCompilerStub.args[0][0]).to.deep.equal({
          compilerPath:
            '/path/to/component/node_modules/oc-template-handlebars-compiler',
          componentName: 'my-component',
          componentPath: '/path/to/component',
          dependency: 'oc-template-handlebars-compiler',
          logger: {}
        });
      });
    });

    describe('when install fails', () => {
      beforeEach(done => {
        installCompilerStub = sinon.stub().yields('Install failed!');
        cleanRequireStub = sinon.stub().returns(undefined);
        execute(done);
      });

      it('should return the error', () => {
        expect(error).to.be.equal('Install failed!');
      });
    });
  });
});
