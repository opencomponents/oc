'use strict';

var expect = require('chai').expect;
var injectr = require('injectr');
var path = require('path');
var sinon = require('sinon');
var _ = require('underscore');

describe('registry : domain : repository', function(){

  var response;
  var saveResult = function(callback){
    return function(err, res){
      response = { error: err, result: res };
      callback();
    };
  };

  describe('when on cdn configuration', function(){

    var componentsCacheMock = {
      get: sinon.stub(),
      refresh: sinon.stub()
    };

    var s3Mock = {
      getFile: sinon.stub(),
      putDir: sinon.stub()
    };

    var Repository = injectr('../../src/registry/domain/repository.js', {
      './s3': function(conf){
        return s3Mock;
      },
      './components-cache': function(){
        return componentsCacheMock;
      }
    });

    var cdnConfiguration = {
      port: 3000,
      prefix: '/v2/',
      publishValidation: function(pkg){
        var ok = !!pkg.author && !!pkg.repository;
        return ok ? ok : { isValid: false, error: 'forbidden!!!'};
      },
      baseUrl: 'http://saymyname.com:3000/v2/',
      env: {
        name: 'prod'
      },
      s3: {
        key: 'a-key',
        secret: 'secrety-key',
        bucket: 'walter-test',
        region: 'us-west-2',
        componentsDir: 'components',
        path: '//s3.amazonaws.com/walter-test/'
      }
    };

    var componentsCacheBaseResponse = {
      components: {
        'hello-world': ['1.0.0'],
        'language': ['1.0.0'],
        'no-containers': ['1.0.0'],
        'welcome': ['1.0.0'],
        'oc-client': ['1.0.0']
      }
    };

    var repository = new Repository(cdnConfiguration);

    describe('when getting the list of available components', function(){

      before(function(done){
        componentsCacheMock.get.yields(null, componentsCacheBaseResponse);
        repository.getComponents(saveResult(done));
      });

      it('should fetch the list from the cache', function(){
        expect(componentsCacheMock.get.called).to.be.true;
      });

      it('should respond without an error', function(){
        expect(response.error).to.be.null;
      });

      it('should list the components', function(){
        expect(response.result).to.eql(['hello-world', 'language', 'no-containers', 'welcome', 'oc-client']);
      });
    });

    describe('when getting the list of supported templates', function(){
      describe('when no templates are specificed on the configuaration', function(){
        it('should return core templates', function(){
          expect(repository.getTemplates().length).to.equal(2);
          expect(repository.getTemplates()[0].type).to.equal('oc-template-jade');
          expect(repository.getTemplates()[1].type).to.equal('oc-template-handlebars');
        });
      });

      describe('when the templates specificed on the configuaration are core-templates', function(){
        it('should only return uniques templates', function(){
           var conf = _.extend(
            cdnConfiguration,
            {templates: ['oc-template-jade']}
          );
          var repository = new Repository(conf);
          expect(repository.getTemplates().length).to.equal(2);  
        });
      });

      describe('when templates specificed on the configuaration are not installed', function(){
        it('should throw an error', function(){
          var conf = _.extend(
            cdnConfiguration,
            {templates: ['oc-template-react']}
          );

          try {
            var repository = new Repository(conf);
          } catch (err) {
            expect(err).to.equal('Error requiring the template "oc-template-react": oc-template not found');  
          }
        });
      });
    });

    describe('when trying to get a not valid component', function(){

      describe('when the component does not exist', function(){
        before(function(done){
          componentsCacheMock.get.yields(null, componentsCacheBaseResponse);
          repository.getComponent('form-component', '1.0.0', saveResult(done));
        });

        it('should respond with a proper error', function(){
          expect(response.error).not.to.be.empty;
          expect(response.error).to.equal('Component "form-component" not found on s3 cdn');
        });
      });

      describe('when the component exists but version does not', function(){
        before(function(done){
          componentsCacheMock.get.yields(null, componentsCacheBaseResponse);
          repository.getComponent('hello-world', '2.0.0', saveResult(done));
        });

        it('should respond with a proper error', function(){
          expect(response.error).not.to.be.empty;
          expect(response.error).to.equal('Component "hello-world" with version "2.0.0" not found on s3 cdn');
        });
      });
    });

    describe('when getting an existing component', function(){

      before(function(done){
        componentsCacheMock.get.yields(null, componentsCacheBaseResponse);
        s3Mock.getFile.yields(null, '{\"name\":\"hello-world\",\"version\":\"1.0.0\"}');
        repository.getComponent('hello-world', '1.0.0', saveResult(done));
      });

      it('should respond without an error', function(){
        expect(response.error).to.be.null;
      });

      it('should fetch the versions\' list from the cache', function(){
        expect(componentsCacheMock.get.called).to.be.true;
      });

      it('should fetch the component info from the correct package.json file', function(){
        expect(s3Mock.getFile.args[0][0]).to.equal('components/hello-world/1.0.0/package.json');
      });

      it('should return the component info', function(){
        expect(response.result).not.to.be.empty;
        expect(response.result.name).to.equal('hello-world');
        expect(response.result.version).to.equal('1.0.0');
      });
    });

    describe('when getting a static file url', function(){

      var url;
      before(function(){
        url = repository.getStaticFilePath('hello-world', '1.0.0', 'hi.txt');
      });

      it('should be using the static redirector from registry', function(){
        expect(url).to.equal('https://s3.amazonaws.com/walter-test/components/hello-world/1.0.0/hi.txt');
      });
    });

    describe('when trying to publish a component', function(){

      describe('when component has not a valid name', function(){
        
        before(function(done){
          repository.publishComponent({}, 'blue velvet', '1.0.0', saveResult(done));
        });

        it('should respond with an error', function(){
          expect(response.error).not.to.be.empty;
          expect(response.error.code).to.equal('name_not_valid');
          expect(response.error.msg).to.equal('The component\'s name contains invalid characters. Allowed are alphanumeric, _, -');
        });
      });

      describe('when component has a not valid version', function(){

        before(function(done){
          repository.publishComponent({}, 'hello-world', '1.0', saveResult(done));
        });

        it('should respond with an error', function(){
          expect(response.error).not.to.be.empty;
          expect(response.error.code).to.equal('version_not_valid');
          expect(response.error.msg).to.eql('Version "1.0" is not a valid semantic version.');
        });
      });

      describe('when component has a valid name and version', function(){

        var pkg = { packageJson: {
          name: 'hello-world',
          author: 'blargh',
          repository: 'asdfa'
        }};

        describe('when component with same name and version is already in library', function(){

          before(function(done){
            componentsCacheMock.get.yields(null, componentsCacheBaseResponse);
            repository.publishComponent(pkg, 'hello-world', '1.0.0', saveResult(done));
          });

          it('should respond with an error', function(){
            var message = 'Component "hello-world" with version "1.0.0" can\'t be ' +
                          'published to s3 cdn because a component with the same ' +
                          'name and version already exists';

            expect(response.error).not.be.empty;
            expect(response.error.code).to.equal('already_exists');
            expect(response.error.msg).to.equal(message);
          });
        });

        describe('when component with same name and version is not in library', function(){

          before(function(done){
            componentsCacheMock.get = sinon.stub();
            componentsCacheMock.get.yields(null, componentsCacheBaseResponse);
            componentsCacheMock.refresh = sinon.stub();
            componentsCacheMock.refresh.yields(null, 'yay');
            s3Mock.putDir = sinon.stub();
            s3Mock.putDir.yields(null, 'done');
            repository.publishComponent(_.extend(pkg, {
              outputFolder: '/path/to/component',
              componentName: 'hello-world'
            }), 'hello-world', '1.0.1', saveResult(done));
          });

          it('should refresh cached components list', function(){
            expect(componentsCacheMock.refresh.called).to.be.true;
          });

          it('should store the component in the correct directory', function(){
            expect(s3Mock.putDir.args[0][0]).to.equal('/path/to/component');
            expect(s3Mock.putDir.args[0][1]).to.equal('components/hello-world/1.0.1');
          });
        });
      });
    });
  });

  describe('when on local configuration', function(){

    var Repository = require('../../src/registry/domain/repository');

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

      before(function(done){
        repository.getComponents(saveResult(done));
      });

      it('should respond without an error', function(){
        expect(response.error).to.be.null;
      });

      it('should list the components', function(){
        expect(response.result).to.eql([
          'container-with-multiple-nested',
          'container-with-nested',
          'errors-component',
          'handlebars3-component',
          'hello-world',
          'hello-world-custom-headers',
          'language',
          'no-containers',
          'underscore-component',
          'welcome',
          'welcome-with-optional-parameters',
          'oc-client'
        ]);
      });
    });

    describe('when trying to get a not valid component', function(){

      describe('when the component does not exist', function(){
        before(function(done){
          repository.getComponent('form-component', '1.0.0', saveResult(done));
        });

        it('should respond with a proper error', function(){
          expect(response.error).not.to.be.empty;
          expect(response.error).to.equal('Component "form-component" not found on local repository');
        });
      });

      describe('when the component exists but version does not', function(){
        before(function(done){
          repository.getComponent('hello-world', '2.0.0', saveResult(done));
        });

        it('should respond with a proper error', function(){
          expect(response.error).not.to.be.empty;
          expect(response.error).to.equal('Component "hello-world" with version "2.0.0" not found on local repository');
        });
      });
    });

    describe('when getting an existing component', function(){

      before(function(done){
        repository.getComponent('hello-world', '1.0.0', saveResult(done));
      });

      it('should respond without an error', function(){
        expect(response.error).to.be.null;
      });

      it('should return the component info', function(){
        expect(response.result).not.to.be.empty;
        expect(response.result.name).to.equal('hello-world');
        expect(response.result.version).to.equal('1.0.0');
      });
    });

    describe('when getting a static file url', function(){

      var url;
      before(function(){
        url = repository.getStaticFilePath('hello-world', '1.0.0', 'hi.txt');
      });

      it('should be using the static redirector from registry', function(){
        expect(url).to.equal('http://localhost/v2/hello-world/1.0.0/static/hi.txt');
      });
    });

    describe('when trying to publish a component', function(){

      var componentDir = path.resolve('../fixtures/components/hello-world');

      before(function(done){
        repository.publishComponent(componentDir, 'hello-world', '1.0.0', saveResult(done));
      });

      it('should respond with an error', function(){
        expect(response.error).not.to.be.empty;
        expect(response.error.code).to.equal('not_allowed');
        expect(response.error.msg).to.equal('Components can\'t be published to local repository');
      });
    });
  });
});