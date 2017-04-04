'use strict';

var expect = require('chai').expect;
var injectr = require('injectr');
var path = require('path');
var sinon = require('sinon');
var uglifyJs = require('uglify-js');
var _ = require('underscore');

var fsMock,
    packageTemplate,
    uglifySpy;

var initialise = function(fs, uglifyStub){

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

describe('cli : domain : package-template', function(){

  describe('when packaging component\'s template', function(){

    describe('when component is not valid', function(){

      describe('when component view is not found', function(){

        var error;
        before(function(done){

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
          }, function(e, r){
            error = e;
            done();
          });
        });

        it('should show error', function(){
          expect(error).to.equal('file template.jade not found');
        });
      });

      describe('when component view type is not valid', function(){

        var error;
        before(function(done){

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
          }, function(e, r){
            error = e;
            done();
          });
        });

        it('should show error', function(){
          expect(error).to.equal('template.wha compilation failed - Error requiring oc-template: "whazaaa" not found');
        });
      });
    });

    describe('when component is valid', function(){

      before(function(done){

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

      it('should save compiled view', function(){
        expect(fsMock.writeFile.args[0][1]).to.contain('<div>this is a jade view</div>');
      });
    });
  });
});
