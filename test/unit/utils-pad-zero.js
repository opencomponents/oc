'use strict';

const expect = require('chai').expect;

describe('utils : padZero', () => {
  const padZero = require('../../src/utils/pad-zero');

  describe('when the correct parameters are provided', () => {
    const anyData = 3;
    const anyValidStringLength = 5;
    const paddedValue = padZero(anyValidStringLength, anyData);

    it('should return the correct padded string', () => {
      expect(paddedValue).to.equal('00003');
    });
  });

  describe('when the provided string length is shorter/equal than the length of the data', () => {
    const anyData = 3;
    const anyToShortStringLength = 1;
    const paddedValue = padZero(anyToShortStringLength, anyData);

    it('should return original data as a string', () => {
      expect(paddedValue).to.be.equal(anyData.toString());
    });
  });
});
