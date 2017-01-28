'use strict';

var expect = require('chai').expect;

describe('registry : domain : options-sanitiser', function(){

  var sanitise = require('../../src/registry/domain/options-sanitiser');

  describe('when verbosity is undefined', function(){

    var options = {};

    it('should set it to 0 as default', function(){
      expect(sanitise(options).verbosity).to.equal(0);
    });
  });

  describe('when verbosity is provided', function(){

    var options = { verbosity: 3 };

    it('should leave value untouched', function(){
      expect(sanitise(options).verbosity).to.equal(3);
    });
  });

  describe('customHeadersToSkipOnWeakVersion', function() {

    describe('when customHeadersToSkipOnWeakVersion is undefined', function() {
      var options = {};

      it('should set it to an empty array', function() {
        expect(sanitise(options).customHeadersToSkipOnWeakVersion).to.be.eql([]);
      });
    });

    describe('when customHeadersToSkipOnWeakVersion contains valid elements', function() {
      var options = {customHeadersToSkipOnWeakVersion: ['header1', 'HeAdEr-TwO', 'HEADER3']};

      it('should convert the array elements to lower case', function() {
        expect(sanitise(options).customHeadersToSkipOnWeakVersion).to.be.eql(['header1', 'header-two', 'header3']);
      });
    });
  });

  describe('fallbackRegistryUrl', function() {

    describe('when fallbackRegistryUrl doesn\'t contain / at the end of url', function() {
      var options = {fallbackRegistryUrl: 'http://test-url.com'};

      it('should add `/` at the end of url', function() {
        expect(sanitise(options).fallbackRegistryUrl).to.be.eql('http://test-url.com/');
      });
    });

    describe('when fallbackRegistryUrl contains `/` at the end of url', function() {
      var options = {fallbackRegistryUrl: 'http://test-url.com/'};

      it('should not modify fallbackRegistryUrl url', function() {
        expect(sanitise(options).fallbackRegistryUrl).to.be.eql('http://test-url.com/');
      });
    });
  });
});