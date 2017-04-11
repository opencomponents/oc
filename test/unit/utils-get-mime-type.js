'use strict';

const expect = require('chai').expect;

describe('utils : getMimeType', () => {

  const getMimeType = require('../../src/utils/get-mime-type');

  describe('when extension is known', () => {

    describe('and extension is .js', () => {
      const mimeType = getMimeType('.js');

      it('should return the correct myme type', () => {
        expect(mimeType).to.equal('application/javascript');
      });
    });

    describe('and extension is .css', () => {
      const mimeType = getMimeType('.css');

      it('should return the correct myme type', () => {
        expect(mimeType).to.equal('text/css');
      });
    });

    describe('and extension is .gif', () => {
      const mimeType = getMimeType('.gif');

      it('should return the correct myme type', () => {
        expect(mimeType).to.equal('image/gif');
      });
    });

    describe('and extension is .jpg', () => {
      const mimeType = getMimeType('.jpg');

      it('should return the correct myme type', () => {
        expect(mimeType).to.equal('image/jpeg');
      });
    });

    describe('and extension is .map', () => {
      const mimeType = getMimeType('.map');

      it('should return the correct myme type', () => {
        expect(mimeType).to.equal('application/json');
      });
    });

    describe('and extension is .png', () => {
      const mimeType = getMimeType('.png');

      it('should return the correct myme type', () => {
        expect(mimeType).to.equal('image/png');
      });
    });

    describe('and extension is .svg', () => {
      const mimeType = getMimeType('.svg');

      it('should return the correct myme type', () => {
        expect(mimeType).to.equal('image/svg+xml');
      });
    });
  });

  describe('when extension is unknown', () => {
    const mimeType = getMimeType('.heisenberg');

    it('should return undefined', () => {
      expect(mimeType).to.be.undefined;
    });
  });
});