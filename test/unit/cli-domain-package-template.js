'use strict';

const expect = require('chai').expect;
const injectr = require('injectr');
const sinon = require('sinon');
const _ = require('lodash');

let fsMock,
  packageTemplate,
  uglifySpy;

const initialise = function(fs, uglifyStub){

  uglifySpy = sinon.spy();
  fsMock = _.extend({
    existsSync: sinon.stub().returns(true),
    readFileSync: sinon.stub().returns('file content'),
    writeFile: sinon.stub().yields(null, 'ok')
  }, fs || {});

  packageTemplate = injectr('../../src/cli/domain/package-template.js', {
    'fs-extra': fsMock,
    'uglify-js': {
      minify: uglifyStub || function(code){
        uglifySpy();
        return { code: code };
      }
    }
  });
};

describe('cli : domain : package-template', () => {

  describe('when packaging component\'s template', () => {

    describe('when component is not valid', () => {

      describe('when component view is not found', () => {

        let error;
        before((done) => {

          initialise({
            existsSync: sinon.stub().returns(false)
          });

          packageTemplate({
            componentPath: '/path/to/component/',
            ocOptions: {
              files: {
                template: {
                  type: 'jade',
                  src: 'template.jade'
                }
              }
            },
            publishPath: '/path/to/component/_package/'
          }, (e) => {
            error = e;
            done();
          });
        });

        it('should show error', () => {
          expect(error).to.equal('file template.jade not found');
        });
      });

      describe('when component view type is not valid', () => {

        let error;
        before((done) => {

          initialise();

          packageTemplate({
            componentPath: '/path/to/component/',
            ocOptions: {
              files: {
                template: {
                  type: 'whazaaa',
                  src: 'template.wha'
                }
              }
            },
            publishPath: '/path/to/component/_package/'
          }, (e) => {
            error = e;
            done();
          });
        });

        it('should show error', () => {
          expect(error).to.equal('template.wha compilation failed - Error requiring oc-template: "whazaaa" not found');
        });
      });
    });

    describe('when component is valid', () => {

      before((done) => {

        initialise({
          readFileSync: sinon.stub().returns('div this is a jade view')
        });

        packageTemplate({
          componentPath: '/path/to/component/',
          ocOptions: {
            files: {
              template: {
                type: 'jade',
                src: 'template.jade'
              }
            }
          },
          publishPath: '/path/to/component/_package/'
        }, done);
      });

      it('should save compiled view', () => {
        expect(fsMock.writeFile.args[0][1]).to.contain('<div>this is a jade view</div>');
      });
    });
  });
});
