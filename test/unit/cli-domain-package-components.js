'use strict';

const expect = require('chai').expect;
const injectr = require('injectr');
const path = require('path');
const sinon = require('sinon');
const _ = require('lodash');

describe('cli : domain : package-components', () => {
  const initialise = function(componentName) {
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
      emptyDirSync: sinon.stub(),
      readJsonSync: sinon.stub()
    };

    fsMock.existsSync.returns(true);
    fsMock.readJsonSync.onCall(0).returns(component);
    fsMock.readJsonSync.onCall(1).returns({ version: '1.2.3' });

    const pathMock = {
      join: () => ''
    };

    const requireTemplateMock = function() {
      return {
        compile: function(options, callback) {
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
      '../../src/cli/domain/package-components.js',
      {
        'fs-extra': fsMock,
        path: pathMock,
        './handle-dependencies/require-template': requireTemplateMock
      },
      { __dirname: '' }
    );

    return { PackageComponents: PackageComponents };
  };

  describe('when packaging', () => {
    describe('when component is valid', () => {
      const PackageComponents = initialise().PackageComponents;
      it('should correctly invoke the callback when template succeed packaging', done => {
        PackageComponents()(
          {
            componentPath: '.',
            minify: true
          },
          (err, info) => {
            expect(err).to.be.null;
            expect(info).to.equal('ok');
            done();
          }
        );
      });
    });

    describe('when component parameters are not valid', () => {
      const PackageComponents = initialise().PackageComponents;
      it('should add version to package.json file', done => {
        PackageComponents()(
          {
            componentPath: '',
            minify: true
          },
          (err, info) => {
            expect(err.message).to.equal('Ouch');
            expect(info).to.be.undefined;
            done();
          }
        );
      });
    });

    describe('when component name is not valid', () => {
      const PackageComponents = initialise('h@lloworld').PackageComponents;
      it('should add version to package.json file', done => {
        PackageComponents()(
          {
            componentPath: '',
            minify: true
          },
          (err, info) => {
            expect(err.message).to.equal('name not valid');
            expect(info).to.be.undefined;
            done();
          }
        );
      });
    });
  });
});
