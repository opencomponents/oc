'use strict';

var nav = window.navigator.userAgent,
    isIe8 = !!(nav.match(/MSIE 8/));

var execute = function(parameters){
  return oc.build(parameters);
};

describe('oc-client : build', function(){

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
        var expectedHref = 'http://www.components.com/v2/myComponent/',
            expected = isIe8 ? '<div data-oc-component="true" href="' + expectedHref + '"></div>' : 
                             '<oc-component href="' + expectedHref + '"></oc-component>';

        expect(result).toEqual(expected);
      });
    });

    describe('when building a component with baseUrl/, name', function(){

      var result = execute({
        baseUrl: 'http://www.components.com/v2/',
        name: 'myComponent'
      });

      it('should build the correct Href', function(){
        var expectedHref = 'http://www.components.com/v2/myComponent/',
            expected = isIe8 ? '<div data-oc-component="true" href="' + expectedHref + '"></div>' : 
                             '<oc-component href="' + expectedHref + '"></oc-component>';

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
            expected = isIe8 ? '<div data-oc-component="true" href="' + expectedHref + '"></div>' : 
                             '<oc-component href="' + expectedHref + '"></oc-component>';

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
            expected = isIe8 ? '<div data-oc-component="true" href="' + expectedHref + '"></div>' : 
                             '<oc-component href="' + expectedHref + '"></oc-component>';

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
            expected = isIe8 ? '<div data-oc-component="true" href="' + expectedHref + '"></div>' : 
                             '<oc-component href="' + expectedHref + '"></oc-component>';

        expect(result).toEqual(expected);
      });
    });
  });
});