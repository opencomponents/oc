'use strict';

var path = require('path');
var expect = require('chai').expect;

describe('registry : domain : repository', function(){

  var Repository = require('../../registry/domain/repository');

  describe('when on local configuration', function(){

    var localConfiguration = {
      local: true,
      path: path.resolve('test/fixtures/components'),
      port: 80,
      prefix: '/v2',
      baseUrl: 'http://localhost/v2/',
      env: {
        name: 'local'
      }
    };

    var repository = new Repository(localConfiguration);

    describe('when getting the list of available components', function(){

      var error,
          components;

      before(function(done){
        repository.getComponents(function(err, res){
          error = err;
          components = res;
          done();
        });
      });

      it('should respond without an error', function(){
        expect(error).to.be.null;
      });

      it('should list the components', function(){
        expect(components).to.eql(['hello-world', 'oc-client']);
      });
    });

    describe('when trying to get a not valid component', function(){

      var result;

      describe('when the component does not exist', function(){
        before(function(done){
          repository.getComponent('form-component', '1.0.0', function(err, res){
            result = {
              error: err,
              component: res
            };
            done();
          });
        });

        it('should respond with a proper error', function(){
          expect(result.error).not.to.be.empty;
          expect(result.error).to.equal('Component "form-component" not found on local repository');
        });
      });

      describe('when the component exists but version does not', function(){
        before(function(done){
          repository.getComponent('hello-world', '2.0.0', function(err, res){
            result = { error: err, component: res };
            done();
          });
        });

        it('should respond with a proper error', function(){
          expect(result.error).not.to.be.empty;
          expect(result.error).to.equal('Component "hello-world" with version "2.0.0" not found on local repository');
        });
      });
    });

    describe('when getting an existing component', function(){

      var result;

      before(function(done){
        repository.getComponent('hello-world', '1.0.0', function(err, res){
          result = {
            error: err,
            component: res
          };
          done();
        });
      });

      it('should respond without an error', function(){
        expect(result.error).to.be.null;
      });

      it('should return the component info', function(){
        expect(result.component).not.to.be.empty;
        expect(result.component.name).to.equal('hello-world');
        expect(result.component.version).to.equal('1.0.0');
      });
    });

    describe('when trying to publish a component', function(){

      var componentDir = path.resolve('../fixtures/components/hello-world'),
          result;

      before(function(done){
        repository.publishComponent(componentDir, 'hello-world', '1.0.0', function(err, res){
          result = {
            error: err,
            component: res
          };
          done();
        });
      });

      it('should respond with an error', function(){
        expect(result.error).not.to.be.empty;
        expect(result.error.code).to.equal('not_allowed');
        expect(result.error.msg).to.equal('Components can\'t be published to local repository');
      });
    });
  });
});