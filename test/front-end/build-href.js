'use strict';

describe('oc-client : build', function(){

  var execute = function(parameters){
    return oc.build(parameters);
  };

  describe('when not providing the mandatory parameters', function(){

    describe('when building a component without baseUrl', function(){

      var throwingFunction = function(){
        return execute({ name: 'someName' });
      };

      it('should throw an error', function(){
        expect(throwingFunction).toThrow('baseUrl parameter is required');
      });
    });

    describe('when building a component without name', function(){

      var throwingFunction = function(){
        return execute({ baseUrl: 'http://www.opencomponents.com' });
      };

      it('should throw an error', function(){
        expect(throwingFunction).toThrow('name parameter is required');
      });
    });
  });

  describe('when providing the mandatory parameters', function(){

    describe('when building a component with baseUrl, name', function(){

      var result = execute({
        baseUrl: 'http://www.components.com/v2',
        name: 'myComponent'
      });

      it('should build the correct Href', function(){
        var expected = '<oc-component href="http://www.components.com/v2/myComponent/"></oc-component>';
        expect(result).toEqual(expected);
      });
    });

    describe('when building a component with baseUrl/, name', function(){

      var result = execute({
        baseUrl: 'http://www.components.com/v2/',
        name: 'myComponent'
      });

      it('should build the correct Href', function(){
        var expected = '<oc-component href="http://www.components.com/v2/myComponent/"></oc-component>';
        expect(result).toEqual(expected);
      });
    });

    describe('when building a component with baseUrl, name, params', function(){

      var result = execute({
        baseUrl: 'http://www.components.com/v2',
        name: 'myComponent',
        parameters: {
          hello: 'world',
          integer: 123,
          boo: true
        }
      });

      it('should build the correct Href', function(){
        var expectedHref = 'http://www.components.com/v2/myComponent/?hello=world&integer=123&boo=true',
            expected = '<oc-component href="' + expectedHref + '"></oc-component>';

        expect(result).toEqual(expected);
      });
    });

    describe('when building a component with baseUrl, name, version', function(){

      var result = execute({
        baseUrl: 'http://www.components.com/v2',
        name: 'myComponent',
        version: '1.0.X'
      });

      it('should build the correct Href', function(){
        var expectedHref = 'http://www.components.com/v2/myComponent/1.0.X/',
            expected = '<oc-component href="' + expectedHref + '"></oc-component>';

        expect(result).toEqual(expected);
      });
    });

    describe('when building a component with baseUrl, name, params, version', function(){

      var result = execute({
        baseUrl: 'http://www.components.com/v2',
        name: 'myComponent',
        parameters: {
          hello: 'world',
          integer: 123,
          boo: true
        },
        version: '1.2.3'
      });

      it('should build the correct Href', function(){
        var expectedHref = 'http://www.components.com/v2/myComponent/1.2.3/?hello=world&integer=123&boo=true',
            expected = '<oc-component href="' + expectedHref + '"></oc-component>';

        expect(result).toEqual(expected);
      });
    });
  });
});