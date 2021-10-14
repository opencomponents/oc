'use strict';

const expect = require('chai').expect;
const injectr = require('injectr');
const sinon = require('sinon');

describe('cli : domain : package-components', () => {
  const initialise = function (componentName) {
    const component = {
      name: componentName || 'helloworld',
      oc: {
        files: {
          static: ['css'],
          template: {
            type: 'jade',
            src: 'template.jade'
          }
        }
      },
      dependencies: {}
    };

    const fsMock = {
      existsSync: sinon.stub(),
      emptyDir: sinon.stub().resolves(),
      readJson: sinon.stub()
    };

    fsMock.existsSync.returns(true);
    fsMock.readJson.onCall(0).resolves(component);
    fsMock.readJson.onCall(1).resolves({ version: '1.2.3' });

    const pathMock = {
      join: () => ''
    };

    const requireTemplateMock = function () {
      return {
        compile: function (options, callback) {
          if (options.componentPath === '.') {
            callback(null, 'ok');
          }
          if (options.componentPath === '') {
            callback(new Error('Ouch'));
          }
        }
      };
    };

    const PackageComponents = injectr(
      '../../dist/cli/domain/package-components.js',
      {
        'fs-extra': fsMock,
        path: pathMock,
        './handle-dependencies/require-template': requireTemplateMock
      },
      { __dirname: '' }
    ).default;

    return PackageComponents;
  };

  describe('when packaging', () => {
    describe('when component is valid', () => {
      const PackageComponents = initialise();
      it('should correctly invoke the callback when template succeed packaging', done => {
        let info;
        PackageComponents()({
          componentPath: '.',
          minify: true
        })
          .then(res => (info = res))
          .finally(() => {
            expect(info).to.equal('ok');
            done();
          });
      });
    });

    describe('when component parameters are not valid', () => {
      const PackageComponents = initialise();
      it('should add version to package.json file', done => {
        let error;
        PackageComponents()({
          componentPath: '',
          minify: true
        })
          .catch(err => {
            error = err;
          })
          .finally(() => {
            expect(error && error.message).to.equal('Ouch');
            done();
          });
      });
    });

    describe('when component name is not valid', () => {
      const PackageComponents = initialise('h@lloworld');
      it('should add version to package.json file', done => {
        let error;
        PackageComponents()({
          componentPath: '.',
          minify: true
        })
          .catch(err => (error = err))
          .finally(() => {
            expect(error.message).to.equal('name not valid');
            done();
          });
      });
    });
  });
});
