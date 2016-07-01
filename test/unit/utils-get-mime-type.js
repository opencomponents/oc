'use strict';

var expect = require('chai').expect;

describe('utils : getMimeType', function(){

  var getMimeType = require('../../src/utils/get-mime-type');

  describe('when extension is known', function(){

    describe('and extension is .js', function(){
      var mimeType = getMimeType('.js');

      it('should return the correct myme type', function(){
        expect(mimeType).to.equal('application/javascript');
      });
    });

    describe('and extension is .css', function(){
      var mimeType = getMimeType('.css');

      it('should return the correct myme type', function(){
        expect(mimeType).to.equal('text/css');
      });
    });

    describe('and extension is .gif', function(){
      var mimeType = getMimeType('.gif');

      it('should return the correct myme type', function(){
        expect(mimeType).to.equal('image/gif');
      });
    });

    describe('and extension is .jpg', function(){
      var mimeType = getMimeType('.jpg');

      it('should return the correct myme type', function(){
        expect(mimeType).to.equal('image/jpeg');
      });
    });

    describe('and extension is .map', function(){
      var mimeType = getMimeType('.map');

      it('should return the correct myme type', function(){
        expect(mimeType).to.equal('application/json');
      });
    });

    describe('and extension is .png', function(){
      var mimeType = getMimeType('.png');

      it('should return the correct myme type', function(){
        expect(mimeType).to.equal('image/png');
      });
    });

    describe('and extension is .svg', function(){
      var mimeType = getMimeType('.svg');

      it('should return the correct myme type', function(){
        expect(mimeType).to.equal('image/svg+xml');
      });
    });
  });

  describe('when extension is unknown', function(){
    var mimeType = getMimeType('.heisenberg');

    it('should return undefined', function(){
      expect(mimeType).to.be.undefined;
    });
  });
});