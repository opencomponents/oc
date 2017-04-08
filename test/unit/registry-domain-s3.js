'use strict';

const expect = require('chai').expect;
const injectr = require('injectr');
const path = require('path');
const sinon = require('sinon');

describe('registry : domain : s3', function(){

  let s3, 
    mockedS3Client,
    error, 
    response;
    
  const S3 = injectr('../../src/registry/domain/s3.js', {
    'fs-extra': {
      readFile: sinon.stub().yields(null, 'file content!')
    },
    'aws-sdk': {
      config: {
        update: sinon.stub()
      },
      S3: function(){
        return mockedS3Client;
      }
    },
    'node-dir': {
      paths: function(input, cb){
        const sep = path.sep;
        cb(null, {
          files: [
            '/absolute-path-to-dir' + sep + 'package.json',
            '/absolute-path-to-dir' + sep + 'server.js',
            '/absolute-path-to-dir' + sep + 'template.js'
          ]
        });
      }
    }
  });

  const initialise = function(){
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

  const execute = function(method, path, callback){
    error = response = undefined;
    s3[method](path, function(err, res){
      error = err;
      response = res;
      callback();
    });
  };
  
  const initialiseAndExecutePut = function(fileName, isPrivate, callback){
    initialise();
    mockedS3Client.putObject.yields(null, 'ok');
    s3.putFile('/path/to/', fileName, isPrivate, function(err, res){
      error = err;
      response = res;
      callback();
    });      
  };
  
  const initialiseAndExecutePutDir = function(callback){
    initialise();
    mockedS3Client.putObject.yields(null, 'ok');
    s3.putDir('/absolute-path-to-dir', 'components\\componentName\\1.0.0', function(err, res){
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

  describe('when publishing directory', function(){

    before(function(done){
      initialiseAndExecutePutDir(done);
    });

    it('should save all the files', function(){
      expect(mockedS3Client.putObject.args.length).to.equal(3);
    });

    it('should save the files using unix-styled path for s3 output locations', function(){
      expect(mockedS3Client.putObject.args[0][0].Key).to.eql('components/componentName/1.0.0/package.json');
      expect(mockedS3Client.putObject.args[1][0].Key).to.eql('components/componentName/1.0.0/server.js');
      expect(mockedS3Client.putObject.args[2][0].Key).to.eql('components/componentName/1.0.0/template.js');
    });
  });

  describe('when publishing file', function(){

    describe('when putting private file', function(){

      before(function(done){
        initialiseAndExecutePut('hello.txt', true, done);
      });

      it('should be saved using authenticated-read ACL', function(){
        const params = mockedS3Client.putObject.args;
        expect(params[0][0].ACL).to.equal('authenticated-read');
      });
    });

    describe('when putting public file', function(){

      before(function(done){
        initialiseAndExecutePut('hello.txt', false, done);
      });

      it('should be saved using public-read ACL', function(){
        const params = mockedS3Client.putObject.args;
        expect(params[0][0].ACL).to.equal('public-read');
      });
    });

    describe('when putting js file', function(){

      before(function(done){
        initialiseAndExecutePut('hello.js', false, done);
      });

      it('should be saved using application/javascript Content-Type', function(){
        const params = mockedS3Client.putObject.args;
        expect(params[0][0].ContentType).to.equal('application/javascript');
      });
    });

    describe('when putting gzipped js file', function(){

      before(function(done){
        initialiseAndExecutePut('hello.js.gz', false, done);
      });

      it('should be saved using application/javascript Content-Type', function(){
        const params = mockedS3Client.putObject.args;
        expect(params[0][0].ContentType).to.equal('application/javascript');
      });

      it('should be saved using gzip Content Content-Encoding', function(){
        const params = mockedS3Client.putObject.args;
        expect(params[0][0].ContentEncoding).to.equal('gzip');
      });
    });

    describe('when putting css file', function(){

      before(function(done){
        initialiseAndExecutePut('hello.css', false, done);
      });

      it('should be saved using text/css Content-Type', function(){
        const params = mockedS3Client.putObject.args;
        expect(params[0][0].ContentType).to.equal('text/css');
      });
    });

    describe('when putting gzipped css file', function(){

      before(function(done){
        initialiseAndExecutePut('hello.css.gz', false, done);
      });

      it('should be saved using text/css Content-Type', function(){
        const params = mockedS3Client.putObject.args;
        expect(params[0][0].ContentType).to.equal('text/css');
      });

      it('should be saved using text/css Content-Encoding', function(){
        const params = mockedS3Client.putObject.args;
        expect(params[0][0].ContentEncoding).to.equal('gzip');
      });
    });

    describe('when putting jpg file', function(){

      before(function(done){
        initialiseAndExecutePut('hello.jpg', false, done);
      });

      it('should be saved using image/jpeg Content-Type', function(){
        const params = mockedS3Client.putObject.args;
        expect(params[0][0].ContentType).to.equal('image/jpeg');
      });
    });

    describe('when putting gif file', function(){

      before(function(done){
        initialiseAndExecutePut('hello.gif', false, done);
      });

      it('should be saved using image/gif Content-Type', function(){
        const params = mockedS3Client.putObject.args;
        expect(params[0][0].ContentType).to.equal('image/gif');
      });
    });

    describe('when putting png file', function(){

      before(function(done){
        initialiseAndExecutePut('hello.png', false, done);
      });

      it('should be saved using image/png fileType', function(){
        const params = mockedS3Client.putObject.args;
        expect(params[0][0].ContentType).to.equal('image/png');
      });
    });
  });
});