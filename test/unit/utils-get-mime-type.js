'use strict';

var expect = require('chai').expect;

describe('utils : getMimeType', function(){

  var getMimeType = require(__BASE + '/utils/get-mime-type');

  describe('when extension is known', function(){
    var mimeType = getMimeType('.js');

    it('should return the correct myme type', function(){
      expect(mimeType).to.equal('application/javascript');
    });
  });

  describe('when extension is unknown', function(){
    var mimeType = getMimeType('.heisenberg');

    it('should return undefined', function(){
      expect(mimeType).to.be.undefined;
    });
  });
});