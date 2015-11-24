'use strict';

var expect = require('chai').expect;

describe('utils : getFileInfo', function(){

  var getFileInfo = require('../../utils/get-file-info');

  describe('when extension is .js', function(){
    var fileInfo = getFileInfo('/path/file.js');

    it('should return the correct myme type', function(){
      expect(fileInfo.mimeType).to.equal('application/javascript');
    });

    it('should return the correct extension', function(){
      expect(fileInfo.extname).to.equal('.js');
    });

    it('should recognise it is not a gzip', function(){
      expect(fileInfo.gzip).to.be.false;
    });
  });

  describe('when extension is .js.gz', function(){
    var fileInfo = getFileInfo('path/file.js.gz');

    it('should return the correct myme type', function(){
      expect(fileInfo.mimeType).to.equal('application/javascript');
    });

    it('should return the correct extension', function(){
      expect(fileInfo.extname).to.equal('.js');
    });

    it('should recognise it is a gzip', function(){
      expect(fileInfo.gzip).to.be.true;
    });
  });

  describe('when extension is .css.gz', function(){
    var fileInfo = getFileInfo('path/file.css.gz');

    it('should return the correct myme type', function(){
      expect(fileInfo.mimeType).to.equal('text/css'); 
    });

    it('should return the correct extension', function(){
      expect(fileInfo.extname).to.equal('.css');
    });

    it('should recognise it is a gzip', function(){
      expect(fileInfo.gzip).to.be.true;
    });
  });

  describe('when extension is unknown', function(){
    var fileInfo = getFileInfo('.heisenberg');

    it('should return mime undefined', function(){
      expect(fileInfo.mimeType).to.be.undefined;
    });

    it('should handle it as not gzip', function(){
      expect(fileInfo.gzip).to.be.false;
    });
  });
});