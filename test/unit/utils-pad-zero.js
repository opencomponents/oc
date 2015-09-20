'use strict';

var expect = require('chai').expect;

describe('utils : padZero', function(){

  var padZero = require('../../utils/pad-zero');

  describe('when the correct parameters are provided', function(){
    var anyData = 3;
    var anyValidStringLength = 5;
    var paddedValue = padZero(anyValidStringLength, anyData);

    it('should return the correct padded string', function(){
      expect(paddedValue).to.equal('00003');
    });
  });

  describe('when the provided string length is shorter/equal than the length of the data', function(){
    var anyData = 3;
    var anyToShortStringLength = 1;
    var paddedValue = padZero(anyToShortStringLength, anyData);

    it('should return original data as a string', function(){
      expect(paddedValue).to.be.equal(anyData.toString());
    });
  });
});
