'use strict';

var AWSMock = require('../mocks/aws-s3-mock');
var path = require('path');
var expect = require('chai').expect;

describe('registry : domain : s3', function(){

  var S3 = require('../../registry/domain/s3');

  describe('when bucket is empty', function(){

    var s3;
    before(function(){
      s3 = new S3({
        client: new AWSMock.S3(),
        bucket: path.resolve('test/fixtures/s3-test-buckets/empty'),
        path: '//s3.amazonaws.com/test-bucket/'
      }, { cache: { refreshInterval: 60 } });
    });

    describe('when trying to access a path that doesn\'t exist', function(){

      var error, response;
      before(function(done){
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

    var s3;
    before(function(){
      s3 = new S3({
        client: new AWSMock.S3(),
        bucket: path.resolve('test/fixtures/s3-test-buckets/test'),
        path: '//s3.amazonaws.com/test-bucket/'
      }, { cache: { refreshInterval: 60 } });
    });

    describe('when getting a list of directories', function(){

      var error, response;
      before(function(done){
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
          s3.getFile('components/image/1.0.1/package.json', function(err, res){
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
          expect(JSON.parse(response)).to.eql({
            name: 'image',
            description: '',
            version: '1.0.1',
            repository: '',
            oc: {
              parameters: {},
              files: {
                template: {
                  type: 'handlebars',
                  hashKey: '18e2619ff1d06451883f21656affd4c6f02b1ed1',
                  src: 'template.js'
                }
              }
            }
          });
        });
      });

      describe('when the file does not exists', function(){

        var error, response;
        before(function(done){
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