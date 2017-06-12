'use strict';

const expect = require('chai').expect;
const _ = require('lodash');

describe('registry : domain : options-sanitiser', () => {
  const sanitise = require('../../src/registry/domain/options-sanitiser');

  describe('when options is empty', () => {
    const options = {};
    const defaults = {
      prefix: '/',
      tempDir: './temp/',
      hotReloading: false,
      verbosity: 0,
      customHeadersToSkipOnWeakVersion: [],
      timeout: 120000
    };

    _.each(defaults, (value, property) => {
      it(`should set ${property} to ${JSON.stringify(value)}`, () => {
        expect(sanitise(options)[property]).to.eql(value);
      });
    });
  });

  describe('when verbosity is provided', () => {
    const options = { verbosity: 3 };

    it('should leave value untouched', () => {
      expect(sanitise(options).verbosity).to.equal(3);
    });
  });

  describe('customHeadersToSkipOnWeakVersion', () => {
    describe('when it contains valid elements', () => {
      const options = {
        customHeadersToSkipOnWeakVersion: ['header1', 'HeAdEr-TwO', 'HEADER3']
      };

      it('should convert the array elements to lower case', () => {
        expect(sanitise(options).customHeadersToSkipOnWeakVersion).to.be.eql([
          'header1',
          'header-two',
          'header3'
        ]);
      });
    });
  });

  describe('fallbackRegistryUrl', () => {
    describe("when fallbackRegistryUrl doesn't contain / at the end of url", () => {
      const options = { fallbackRegistryUrl: 'http://test-url.com' };

      it('should add `/` at the end of url', () => {
        expect(sanitise(options).fallbackRegistryUrl).to.be.eql(
          'http://test-url.com/'
        );
      });
    });

    describe('when fallbackRegistryUrl contains `/` at the end of url', () => {
      const options = { fallbackRegistryUrl: 'http://test-url.com/' };

      it('should not modify fallbackRegistryUrl url', () => {
        expect(sanitise(options).fallbackRegistryUrl).to.be.eql(
          'http://test-url.com/'
        );
      });
    });
  });
});
