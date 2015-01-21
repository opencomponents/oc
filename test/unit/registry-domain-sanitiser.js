'use strict';

var expect = require('chai').expect;

describe('registry : domain : sanitiser', function(){

  var sanitiser = require('../../registry/domain/sanitiser');

  describe('when sanitising component\'s request parameters', function(){

    var sanitise = function(a,b){ return sanitiser.sanitiseComponentParameters(a,b); };

    describe('when component have boolean parameter', function(){

      it('should convert string to boolean when true', function(){
        
        var componentParameters = {
          isTrue: {
            type: 'boolean',
            mandatory: true,
            example: true
          }
        };

        var requestParameters = { isTrue: 'true' },
            sanitisedParameters = sanitise(requestParameters, componentParameters);

        expect(sanitisedParameters).to.eql({ isTrue: true });
      });

      it('should convert string to boolean when true', function(){
        
        var componentParameters = {
          isTrue: {
            type: 'boolean',
            mandatory: true,
            example: true
          }
        };

        var requestParameters = { isTrue: 'false' },
            sanitisedParameters = sanitise(requestParameters, componentParameters);

        expect(sanitisedParameters).to.eql({ isTrue: false });
      });

    });

    describe('when component have number parameter', function(){

      it('should convert string to number', function(){

        var componentParameters = {
          age: {
            type: 'number',
            mandatory: true,
            example: 1234
          }
        };

        var requestParameters = { age: '123' },
            sanitisedParameters = sanitise(requestParameters, componentParameters);

        expect(sanitisedParameters).to.eql({ age: 123 });
      });
    });

    describe('when component have not defined optional parameter', function(){

      it('should keep the parameter as it is', function(){

        var componentParameters = {},
            requestParameters = { age: 123 },
            sanitisedParameters = sanitise(requestParameters, componentParameters);

        expect(sanitisedParameters).to.eql({ age: 123 });
      });
    });
  });
});