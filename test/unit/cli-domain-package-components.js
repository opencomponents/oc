'use strict';

const expect = require('chai').expect;
const injectr = require('injectr');
const path = require('path');
const sinon = require('sinon');
const _ = require('lodash');

describe('cli : domain : package-components', () => {

  let packageStaticFilesStub;

  const initialise = function(){

    const fsMock = {
      existsSync: sinon.stub(),
      lstatSync: sinon.stub(),
      mkdirSync: sinon.spy(),
      readdirSync: sinon.stub(),
      readFileSync: sinon.stub(),
      readJson: sinon.stub(),
      readJsonSync: sinon.stub(),
      writeFile: sinon.stub().yields(null, 'ok'),
      writeJson: sinon.stub().yields(null, 'ok')
    };

    const pathMock = {
      extname: path.extname,
      join: path.join,
      resolve: function(){
        return _.toArray(arguments).join('/');
      }
    };

    packageStaticFilesStub = sinon.stub().yields(null, 'ok');

    const PackageComponents = injectr('../../src/cli/domain/package-components.js', {
      'fs-extra': fsMock,
      path: pathMock,
      './package-static-files': packageStaticFilesStub,
      './package-template': sinon.stub().yields(null, { type: 'jade', src: 'template.js', hashKey: '123456'})
    }, { __dirname: ''});

    const packageComponents = new PackageComponents();

    return { packageComponents: packageComponents, fs: fsMock };
  };

  const executePackaging = function(packageComponents, minify, callback){
    return packageComponents({
      componentPath: '.',
      minify: minify,
      verbose: false
    }, callback);
  };

  describe('when packaging', () => {

    describe('when component is valid', () => {

      describe('when minify=true', () => {

        let component;
        beforeEach((done) => {

          const data = initialise();

          component = {
            name: 'helloworld',
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

          data.fs.existsSync.returns(true);
          data.fs.readJsonSync.onCall(0).returns(component);
          data.fs.readJsonSync.onCall(1).returns({ version: '1.2.3' });

          executePackaging(data.packageComponents, true, done);
        });

        it('should add version to package.json file', () => {
          expect(component.oc.version).to.eql('1.2.3');
        });

        it('should mark the package.json as a packaged', () => {
          expect(component.oc.packaged).to.eql(true);
        });

        it('should save hash for template in package.json', () => {
          expect(component.oc.files.template.hashKey).not.be.empty;
        });

        it('should minify static resources', () => {
          expect(packageStaticFilesStub.args[0][0].minify).to.eql(true);
        });
      });

      describe('when minify=false', () => {

        let component;
        beforeEach((done) => {

          const data = initialise();

          component = {
            name: 'helloworld',
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

          data.fs.existsSync.returns(true);
          data.fs.readJsonSync.onCall(0).returns(component);
          data.fs.readJsonSync.onCall(1).returns({ version: '1.2.3' });

          executePackaging(data.packageComponents, false, done);
        });

        it('should add version to package.json file', () => {
          expect(component.oc.version).to.eql('1.2.3');
        });

        it('should mark the package.json as a packaged', () => {
          expect(component.oc.packaged).to.eql(true);
        });

        it('should save hash for template in package.json', () => {
          expect(component.oc.files.template.hashKey).not.be.empty;
        });

        it('should minify static resources', () => {
          expect(packageStaticFilesStub.args[0][0].minify).to.eql(false);
        });
      });
    });
  });
});
