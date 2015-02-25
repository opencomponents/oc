'use strict';

var path = require('path');
var expect = require('chai').expect;
var sinon = require('sinon');

describe('registry : domain : s3', function(){

  var S3 = require('../../registry/domain/s3'),
      s3,
      listObjectsStub,
      getObjectStub;

  var initialise = function(){
    getObjectStub = sinon.stub();
    listObjectsStub = sinon.stub();

    s3 = new S3({ 
      client: {
        getObject: getObjectStub,
        listObjects: listObjectsStub
      },
      bucket: path.resolve('test/fixtures/s3-test-buckets/empty'),
      path: '//s3.amazonaws.com/test-bucket/'
    }, { cache: { refreshInterval: 60 }});    
  };

  describe('when bucket is empty', function(){

    describe('when trying to access a path that doesn\'t exist', function(){

      var error, response;
      before(function(done){
        initialise();
        listObjectsStub.yields(null, {
          CommonPrefixes: []
        });

        s3.listSubDirectories('hello', function(err, res){
          error = err;
          response = res;
          done();
        });
      });

      it('should respond with an error', function(){
        expect(error).not.to.be.empty;
        expect(error.code).to.equal('dir_not_found');
        expect(error.msg).to.equal('Directory "hello" not found');
      });
    });
  });

  describe('when bucket contains files and directories', function(){

    describe('when getting a list of directories', function(){

      var error, response;
      before(function(done){
        initialise();
        listObjectsStub.yields(null, {
          CommonPrefixes: [{
            Prefix: 'components/hello-world/'
          },{
            Prefix: 'components/image/'
          }]
        });
        s3.listSubDirectories('components', function(err, res){
          error = err;
          response = res;
          done();
        });
      });

      it('should respond without an error', function(){
        expect(error).to.be.null;
      });

      it('should respond with the list of directories', function(){
        expect(response).to.eql(['hello-world', 'image']);
      });
    });

    describe('when getting a list of subdirectories', function(){

      var error, response;
      before(function(done){
        initialise();
        listObjectsStub.yields(null, {
          CommonPrefixes: [{
            Prefix: 'components/image/1.0.0/'
          }, {
            Prefix: 'components/image/1.0.1/'
          }]
        });
        s3.listSubDirectories('components/image', function(err, res){
          error = err;
          response = res;
          done();
        });
      });

      it('should respond without an error', function(){
        expect(error).to.be.null;
      });

      it('should respond with the list of subdirectories', function(){
        expect(response).to.eql(['1.0.0', '1.0.1']);
      });
    });

    describe('when getting a file\'s content', function(){

      describe('when the file exists', function(){

        var error, response;
        before(function(done){
          initialise();
          getObjectStub.yields(null, {
            Body: 'Hello!'
          });
          s3.getFile('components/image/1.0.1/src/hello.txt', function(err, res){
            error = err;
            response = res;
            done();
          });
        });

        it('should respond without an error', function(){
          expect(error).to.be.null;
        });

        it('should respond with the file content', function(){
          expect(response).not.to.be.empty;
          expect(response).to.eql('Hello!');
        });
      });

      describe('when the file does not exists', function(){

        var error, response;
        before(function(done){
          initialise();
          getObjectStub.yields({
            code: 'NoSuchKey'
          });
          s3.getFile('components/image/1.0.1/random-file.json', function(err, res){
            error = err;
            response = res;
            done();
          });
        });

        it('should respond with a proper error', function(){
          expect(error).not.to.be.empty;
          expect(error.code).to.equal('file_not_found');
          expect(error.msg).to.equal('File "components/image/1.0.1/random-file.json" not found');
        });
      });
    });
  });
});