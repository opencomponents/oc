'use strict';

const expect = require('chai').expect;

describe('client : validator', () => {

  const validator = require('../../client/src/validator');

  describe('when validating configuration', () => {

    describe('when registries is an array', () => {

      const result = validator.validateConfiguration({
        registries: ['http://www.registries.com']
      });

      it('should error', () => {
        expect(result.isValid).to.be.false;
        expect(result.error).to.equal('Configuration is not valid: registries must be an object');
      });
    });

    describe('when registries doesn\'t have neither clientRendering or serverRendering properties', () => {

      const result = validator.validateConfiguration({
        registries: {}
      });

      it('should error', () => {
        expect(result.isValid).to.be.false;
        expect(result.error).to.equal('Configuration is not valid: registries must contain at least one endpoint');
      });
    });
  });
});
