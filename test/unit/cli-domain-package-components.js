'use strict';

var expect = require('chai').expect;
var injectr = require('injectr');
var path = require('path');
var sinon = require('sinon');
var _ = require('underscore');

var initialise = function(){

  var fsMock = {
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

  var pathMock = {
    extname: path.extname,
    join: path.join,
    resolve: function(){
      return _.toArray(arguments).join('/');
    }
  };

  var Local = injectr('../../cli/domain/package-components.js', {
    'fs-extra': fsMock,
    'uglify-js': {
      minify: function(code){
        return {
          code: code
        };
      }
    },
    path: pathMock,
    './package-static-files': sinon.stub().yields(null, 'ok'),
    './package-template': sinon.stub().yields(null, { type: 'jade', src: 'template.js', hashKey: '123456'})
  }, { __dirname: '' });

  var local = new Local();

  return { local: local, fs: fsMock };
};

var executePackaging = function(local, callback){
  return local('.', false, callback);
};

describe('cli : domain : local', function(){

  describe('when packaging', function(){

    describe('when component is valid', function(){

      var component;
      beforeEach(function(done){

        var data = initialise();

        component = {
          name: 'helloworld',
          oc: {
            files: {
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

        executePackaging(data.local, done);
      });

      it('should add version to package.json file', function(){
        expect(component.oc.version).to.eql('1.2.3');
      });

      it('should mark the package.json as a packaged', function(){
        expect(component.oc.packaged).to.eql(true);
      });

      it('should save hash for template in package.json', function(){
        expect(component.oc.files.template.hashKey).not.be.empty;
      });
    });
  });
});
