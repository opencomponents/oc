'use strict';

const expect = require('chai').expect;

describe('cli : domain : handle-dependencies : ensure-compiler-is-declared-as-devDependency', () => {
  const ensure = require('../../src/cli/domain/handle-dependencies/ensure-compiler-is-declared-as-devDependency');
  describe('when compiler is declared as devDependency', () => {
    let error, result;
    beforeEach(done => {
      ensure(
        {
          componentPath: '/path/to/component/',
          pkg: {
            devDependencies: {
              'oc-template-react-compiler': '1.x.x'
            }
          },
          template: 'oc-template-react'
        },
        (err, compilerDep) => {
          error = err;
          result = compilerDep;
          done();
        }
      );
    });

    it('should return no error', () => {
      expect(error).to.be.null;
    });

    it('should return the compiler dependency', () => {
      expect(result).to.equal('oc-template-react-compiler');
    });
  });

  describe('when compiler is not declared as devDependency', () => {
    let error, result;
    beforeEach(done => {
      ensure(
        {
          componentPath: '/path/to/component/',
          pkg: {
            devDependencies: {}
          },
          template: 'oc-template-react'
        },
        (err, compilerDep) => {
          error = err;
          result = compilerDep;
          done();
        }
      );
    });

    it('should return the error', () => {
      expect(error).to.contain(
        'Template dependency missing. To fix it run:\n\nnpm install --save-dev oc-template-react-compiler --prefix /path/to/component/'
      );
    });
  });
});
