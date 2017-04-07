'use strict';

const expect = require('chai').expect;
const fs = require('fs-extra');
const path = require('path');
const targz = require('targz');
const _ = require('underscore');

describe('The targz dependency', function(){

  describe('when compressing a folder with targz', function(){
    
    const file = path.resolve(__dirname, '../fixtures/test.tar.gz');

    beforeEach(function(done){
      const from = path.resolve(__dirname, '../fixtures/components/hello-world');
      targz.compress({
        src: from,
        dest: file,
        tar: {
          map: function(fileName) {
            return _.extend(fileName, {
              name: 'hello-world/' + fileName.name
            });
          }
        }
      }, done);
    });

    it('should create the file', function(){
      expect(fs.existsSync(file));
    });

    describe('when decompressing the created file', function(){

      let error;
      const to = path.resolve(__dirname, '../fixtures/targz-test');

      beforeEach(function(done){ 
        targz.decompress({
          src: file,
          dest: to
        }, function(err){
          error = err;
          done();
        });
      });

      it('should throw no error', function(){
        expect(!!error).to.be.false;
      });

      it('should contain the files', function(){
        expect(fs.existsSync(to)).to.be.true;
        expect(fs.readFileSync(path.join(to, 'hello-world/template.html')).toString()).to.be.equal('Hello world!');
      });
    });
  });
});