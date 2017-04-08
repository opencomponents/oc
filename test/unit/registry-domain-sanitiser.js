'use strict';

const expect = require('chai').expect;

describe('registry : domain : sanitiser', function(){

  const sanitiser = require('../../src/registry/domain/sanitiser');

  describe('when sanitising component\'s request parameters', function(){

    const sanitise = function(a,b){ return sanitiser.sanitiseComponentParameters(a,b); };

    describe('when component has boolean parameter', function(){

      it('should convert string to boolean when true', function(){
        
        const componentParameters = {
          isTrue: {
            type: 'boolean',
            mandatory: true,
            example: true
          }
        };

        const requestParameters = { isTrue: 'true' },
          sanitisedParameters = sanitise(requestParameters, componentParameters);

        expect(sanitisedParameters).to.eql({ isTrue: true });
      });

      it('should convert string to boolean when true', function(){
        
        const componentParameters = {
          isTrue: {
            type: 'boolean',
            mandatory: true,
            example: true
          }
        };

        const requestParameters = { isTrue: 'false' },
          sanitisedParameters = sanitise(requestParameters, componentParameters);

        expect(sanitisedParameters).to.eql({ isTrue: false });
      });
    });

    describe('when component has string parameter', function(){

      it('should convert null to empty', function(){

        const componentParameters = {
          myString: {
            type: 'string',
            mandatory: false,
            example: 'hello'
          }
        };

        const requestParameters = { myString: null },
          sanitisedParameters = sanitise(requestParameters, componentParameters);

        expect(sanitisedParameters).to.eql({ myString: '' });
      });
    });

    describe('when component has number parameter', function(){

      it('should convert string to number', function(){

        const componentParameters = {
          age: {
            type: 'number',
            mandatory: true,
            example: 1234
          }
        };

        const requestParameters = { age: '123' },
          sanitisedParameters = sanitise(requestParameters, componentParameters);

        expect(sanitisedParameters).to.eql({ age: 123 });
      });
    });

    describe('when component have not defined optional parameter', function(){

      it('should keep the parameter as it is', function(){

        const componentParameters = {},
          requestParameters = { age: 123 },
          sanitisedParameters = sanitise(requestParameters, componentParameters);

        expect(sanitisedParameters).to.eql({ age: 123 });
      });
    });
  });
});