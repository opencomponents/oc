'use strict';

var expect = require('chai').expect;
var fs = require('fs-extra');
var path = require('path');
var Targz = require('tar.gz');

describe('The Targz dependency', function(){
  var targz;

  beforeEach(function(){
    targz = new Targz();
  });

  describe('when compressing a folder', function(){
    
    var file = path.resolve(__dirname, '../fixtures/test.tar.gz');

    beforeEach(function(done){
      var from = path.resolve(__dirname, '../fixtures/components/hello-world');
      targz.compress(from, file, done);
    });

    it('should create the file', function(){
      expect(fs.existsSync(file));
    });

    describe('when decompressing the created file', function(){

      var error,
          to = path.resolve(__dirname, '../fixtures/targz-test'); 

      beforeEach(function(done){ 
        targz.extract(file, to, function(err){
          error = err;
          done();
        });
      });

      it('should throw no error', function(){
        expect(error).to.be.null;
      });

      it('should contain the files', function(){
        expect(fs.existsSync(to)).to.be.true;
        expect(fs.readFileSync(path.join(to, 'hello-world/template.html')).toString()).to.be.equal('Hello world!');
      });
    });
  });
});