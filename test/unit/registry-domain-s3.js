'use strict';

var expect = require('chai').expect;
var injectr = require('injectr');
var sinon = require('sinon');

describe('registry : domain : s3', function(){

  var s3, 
      mockedS3Client,
      error, 
      response;
    
  var S3 = injectr('../../registry/domain/s3.js', {
    'fs-extra': {
      readFileSync: sinon.stub().returns('file content!')
    },
    'aws-sdk': {
      config: {
        update: sinon.stub()
      },
      S3: function(){
        return mockedS3Client;
      }
    }
  });

  var initialise = function(){
    mockedS3Client = {
      getObject: sinon.stub(),
      listObjects: sinon.stub(),
      putObject: sinon.stub()
    };

    s3 = new S3({ 
      cache: { refreshInterval: 60 }, 
      s3: {
        bucket: 'test-bucket',
        path: '//s3.amazonaws.com/test-bucket/'
      }
    });
  };

  var execute = function(method, path, callback){
    error = response = undefined;
    s3[method](path, function(err, res){
      error = err;
      response = res;
      callback();
    });
  };
  
  var initialiseAndExecutePut = function(fileName, isPrivate, callback){
    initialise();
    mockedS3Client.putObject.yields(null, 'ok');
    s3.putFile('/path/to/', fileName, isPrivate, function(err, res){
      error = err;
      response = res;
      callback();
    });      
  };

  describe('when bucket is empty', function(){

    describe('when trying to access a path that doesn\'t exist', function(){

      before(function(done){
        initialise();
        mockedS3Client.listObjects.yields(null, {
          CommonPrefixes: []
        });

        execute('listSubDirectories', 'hello', done);
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

      before(function(done){
        initialise();
        mockedS3Client.listObjects.yields(null, {
          CommonPrefixes: [{
            Prefix: 'components/hello-world/'
          },{
            Prefix: 'components/image/'
          }]
        });

        execute('listSubDirectories', 'components', done);
      });

      it('should respond without an error', function(){
        expect(error).to.be.null;
      });

      it('should respond with the list of directories', function(){
        expect(response).to.eql(['hello-world', 'image']);
      });
    });

    describe('when getting a list of subdirectories', function(){

      before(function(done){
        initialise();
        mockedS3Client.listObjects.yields(null, {
          CommonPrefixes: [{
            Prefix: 'components/image/1.0.0/'
          }, {
            Prefix: 'components/image/1.0.1/'
          }]
        });

        execute('listSubDirectories', 'components/image', done);
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

        before(function(done){
          initialise();
          mockedS3Client.getObject.yields(null, { Body: 'Hello!' });
          execute('getFile', 'components/image/1.0.1/src/hello.txt', done);
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

        before(function(done){
          initialise();
          mockedS3Client.getObject.yields({ code: 'NoSuchKey' });
          execute('getFile', 'components/image/1.0.1/random-file.json', done);
        });

        it('should respond with a proper error', function(){
          expect(error).not.to.be.empty;
          expect(error.code).to.equal('file_not_found');
          expect(error.msg).to.equal('File "components/image/1.0.1/random-file.json" not found');
        });
      });
    });
  });

  describe('when publishing file', function(){

    describe('when putting private file', function(){

      before(function(done){
        initialiseAndExecutePut('hello.txt', true, done);
      });

      it('should be saved using authenticated-read ACL', function(){
        var params = mockedS3Client.putObject.args;
        expect(params[0][0].ACL).to.equal('authenticated-read');
      });
    });

    describe('when putting public file', function(){

      before(function(done){
        initialiseAndExecutePut('hello.txt', false, done);
      });

      it('should be saved using public-read ACL', function(){
        var params = mockedS3Client.putObject.args;
        expect(params[0][0].ACL).to.equal('public-read');
      });
    });

    describe('when putting js file', function(){

      before(function(done){
        initialiseAndExecutePut('hello.js', false, done);
      });

      it('should be saved using application/javascript fileType', function(){
        var params = mockedS3Client.putObject.args;
        expect(params[0][0].ContentType).to.equal('application/javascript');
      });
    });

    describe('when putting css file', function(){

      before(function(done){
        initialiseAndExecutePut('hello.css', false, done);
      });

      it('should be saved using text/css fileType', function(){
        var params = mockedS3Client.putObject.args;
        expect(params[0][0].ContentType).to.equal('text/css');
      });
    });

    describe('when putting jpg file', function(){

      before(function(done){
        initialiseAndExecutePut('hello.jpg', false, done);
      });

      it('should be saved using image/jpeg fileType', function(){
        var params = mockedS3Client.putObject.args;
        expect(params[0][0].ContentType).to.equal('image/jpeg');
      });
    });

    describe('when putting gif file', function(){

      before(function(done){
        initialiseAndExecutePut('hello.gif', false, done);
      });

      it('should be saved using image/gif fileType', function(){
        var params = mockedS3Client.putObject.args;
        expect(params[0][0].ContentType).to.equal('image/gif');
      });
    });

    describe('when putting png file', function(){

      before(function(done){
        initialiseAndExecutePut('hello.png', false, done);
      });

      it('should be saved using image/png fileType', function(){
        var params = mockedS3Client.putObject.args;
        expect(params[0][0].ContentType).to.equal('image/png');
      });
    });
  });
});