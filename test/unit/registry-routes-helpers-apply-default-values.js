'use strict';

const expect = require('chai').expect;

describe('registry : routes : helpers : apply-default-values', function(){

  let parameters;
  const applyDefaultValues = require('../../src/registry/routes/helpers/apply-default-values');
  const apply = function(a, b) {
    return applyDefaultValues(a, b);
  };

  describe('when component deesn\'t have optional parameters', function(){
    const componentParameters = {
      mandatory: {
        type: 'string',
        mandatory: true,
        example: 'example value of mandatory parameter'
      }
    };

    before(function(){
      parameters = apply({ mandatory: 'request value' }, componentParameters);
    });

    it('should return requestParameters', function(){
      expect(parameters).to.eql({ mandatory: 'request value' });
    });
  });

  describe('when component has optional parameters', function(){
    describe('when default value of parameter is not specified', function(){
      const componentParameters = {
        mandatory: {
          type: 'string',
          mandatory: true,
          example: 'example value of mandatory parameter'
        },
        optional: {
          type: 'string',
          mandatory: false,
          example: 'example value of optional parameter'
        }
      };

      describe('when request doesn\'t specify values of optional parameters', function(){
        before(function(){
          parameters = apply({ mandatory: 'request value' }, componentParameters);
        });

        it('should return requestParameters', function(){
          expect(parameters).to.eql({ mandatory: 'request value' });
        });
      });
    });
    
    describe('when default value of parameter is specified', function() {
      const componentParameters = {
        mandatory: {
          type: 'string',
          mandatory: true,
          example: 'example value of mandatory parameter'
        },
        optional: {
          type: 'string',
          mandatory: false,
          example: 'example value of optional parameter',
          default: 'default value of optional parameter'
        },
        optional2: {
          type: 'boolean',
          mandatory: false,
          example: false,
          default: false
        }
      };

      describe('when request specify values of optional parameters', function(){
        before(function(){
          parameters = apply({ mandatory: 'request value', optional: 'custom value', optional2: true }, componentParameters);
        });

        it('should return requestParameters', function(){
          expect(parameters).to.eql({ mandatory: 'request value', optional: 'custom value', optional2: true });
        });
      });

      describe('when request specify values of some optional parameters', function(){
        before(function(){
          parameters = apply({ mandatory: 'request value', optional: 'custom value' }, componentParameters);
        });

        it('should return requestParameters', function(){
          expect(parameters).to.eql({ mandatory: 'request value', optional: 'custom value', optional2: false });
        });
      });

      describe('when request doesn\'t specify values of optional parameters', function(){

        describe('when string parameter is undefined', function(){
          before(function(){
            parameters = apply({ mandatory: 'request value' }, componentParameters);
          });

          it('should return requestParameters with default values of optional parameters', function(){
            expect(parameters).to.eql({ mandatory: 'request value', optional: 'default value of optional parameter', optional2: false
           });
          });
        });

        describe('when string parameter is null', function(){
          before(function(){
            parameters = apply({ mandatory: 'request value', optional: null }, componentParameters);
          });

          it('should return requestParameters with default values of optional parameters', function(){
            expect(parameters).to.eql({ mandatory: 'request value', optional: 'default value of optional parameter', optional2: false
           });
          });
        });
      });
    });
  });
});