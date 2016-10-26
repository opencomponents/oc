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
});