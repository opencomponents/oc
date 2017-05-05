'use strict';

const expect = require('chai').expect;

describe('utils : getFileInfo', () => {

  const getFileInfo = require('../../src/utils/get-file-info');

  describe('when extension is .js', () => {
    const fileInfo = getFileInfo('/path/file.js');

    it('should return the correct myme type', () => {
      expect(fileInfo.mimeType).to.equal('application/javascript');
    });

    it('should return the correct extension', () => {
      expect(fileInfo.extname).to.equal('.js');
    });

    it('should recognise it is not a gzip', () => {
      expect(fileInfo.gzip).to.be.false;
    });
  });

  describe('when extension is .js.gz', () => {
    const fileInfo = getFileInfo('path/file.js.gz');

    it('should return the correct myme type', () => {
      expect(fileInfo.mimeType).to.equal('application/javascript');
    });

    it('should return the correct extension', () => {
      expect(fileInfo.extname).to.equal('.js');
    });

    it('should recognise it is a gzip', () => {
      expect(fileInfo.gzip).to.be.true;
    });
  });

  describe('when extension is .css.gz', () => {
    const fileInfo = getFileInfo('path/file.css.gz');

    it('should return the correct myme type', () => {
      expect(fileInfo.mimeType).to.equal('text/css');
    });

    it('should return the correct extension', () => {
      expect(fileInfo.extname).to.equal('.css');
    });

    it('should recognise it is a gzip', () => {
      expect(fileInfo.gzip).to.be.true;
    });
  });

  describe('when extension is unknown', () => {
    const fileInfo = getFileInfo('.heisenberg');

    it('should return mime undefined', () => {
      expect(fileInfo.mimeType).to.be.undefined;
    });

    it('should handle it as not gzip', () => {
      expect(fileInfo.gzip).to.be.false;
    });
  });
});