'use strict';

var preRenderedResponse = {
  href: 'http://my-registry.com/v3/a-component/1.2.X/?name=John',
  type: 'oc-component',
  version: '1.2.123',
  requestVersion: '1.2.X',
  data: {},
  template: {
    src: 'https://my-cdn.com/components/a-component/1.2.123/template.js',
    type: 'handlebars',
    key: '18e2619ff1d06451883f21656affd4c6f02b1ed1'
  },
  renderMode: 'pre-rendered'
};

var renderedResponse = {
  href: 'http://my-registry.com/v3/a-component/1.2.X/?name=John',
  type: 'oc-component',
  version: '1.2.123',
  requestVersion: '1.2.X',
  html: '<oc-component href="http://my-registry.com/v3/a-component/1.2.X/?name=John" data-hash="389d92b88e4fc9bed8f0d8329a8a9b488ef3def1" id="4709139819" data-rendered="true" data-version="1.2.123">Hello, world!!!</oc-component>',
  renderMode: 'rendered'
};

var renderedNoContainerResponse = {
  href: 'http://my-registry.com/v3/a-component/1.2.X/?name=John',
  type: 'oc-component',
  version: '1.2.123',
  requestVersion: '1.2.X',
  html: 'Hello, world!!',
  renderMode: 'rendered'
};

var route = 'http://my-registry.com/v3/a-component/1.2.X/?name=John',
    compiledViewContent = 'oc.components=oc.components||{},oc.components["18e2619ff1d06451883f21656affd4c6f02b1ed1"]=function(o,e,c,n,f){return this.compilerInfo=[4,">= 1.0.0"],c=this.merge(c,o.helpers),f=f||{},"Hello world!"};';

var originalAjax = jQuery.ajax;

var initialise = function(response, fail){
  var spy = sinon.spy();

  jQuery.ajax = $.ajax = function(params){
    var method = (typeof(fail) === 'boolean' && fail) ? 'error' : 'success';

    spy(params);
    params[method](response);
  };

  sinon.stub(head, 'load').yields(null, 'ok');
  sinon.stub(console, 'log');
  return spy;
};

var cleanup = function(){
  head.load.restore();
  console.log.restore();
  jQuery.ajax = $.ajax = originalAjax;
  delete oc.components;
};

describe('oc-client plugin', function(){
  
  describe('when loaded', function(){
    
    it('should expose the oc namespace', function(){
      expect(window.oc).toEqual(jasmine.any(Object));
    });

    describe('when rendering component by href', function(){

      describe('before doing the rendering', function(){

        var callback, ajaxMock;
        beforeEach(function(){
          callback = sinon.spy();
          ajaxMock = initialise(preRenderedResponse);
          eval(compiledViewContent);
          oc.renderByHref(route, callback);
        });

        afterEach(cleanup);

        it('should make a call to the registry', function(){
          expect(ajaxMock.called).toBe(true);
        });

        it('should make a request to the registry with proper headers', function(){
          expect(ajaxMock.args[0][0].contentType).toEqual('text/plain');
          expect(ajaxMock.args[0][0].headers['Accept']).toEqual('application/vnd.oc.prerendered+json');
        });
      });

      describe('when the registry responds with pre-rendered component', function(){

        var callback;
        beforeEach(function(){
          callback = sinon.spy();
          initialise(preRenderedResponse);
          eval(compiledViewContent);
          oc.renderByHref(route, callback);
        });

        afterEach(cleanup);

        it('should respond without an error', function(){
          expect(callback.args[0][0]).toBe(null);
        });

        it('should respond with the rendered html', function(){
          expect(callback.args[0][1].html).toEqual('Hello world!');
        });

        it('should respond with the correct version', function(){
          expect(callback.args[0][1].version).toEqual('1.2.123');
        });

        it('should respond with the correct hash key', function(){
          expect(callback.args[0][1].key).toEqual('18e2619ff1d06451883f21656affd4c6f02b1ed1');
        });
      });

      describe('when the registry responds with rendered component with container', function(){

        var callback;
        beforeEach(function(){
          callback = sinon.spy();
          initialise(renderedResponse);
          eval(compiledViewContent);
          oc.renderByHref(route, callback);
        });

        afterEach(cleanup);

        it('should respond without an error', function(){
          expect(callback.args[0][0]).toBe(null);
        });

        it('should respond with the rendered html', function(){
          expect(callback.args[0][1].html).toEqual('Hello, world!!!');
        });

        it('should respond with the correct version', function(){
          expect(callback.args[0][1].version).toEqual('1.2.123');
        });
      });

      describe('when the registry responds with rendered component without container', function(){

        var callback;
        beforeEach(function(){
          callback = sinon.spy();
          initialise(renderedNoContainerResponse);
          eval(compiledViewContent);
          oc.renderByHref(route, callback);
        });

        afterEach(cleanup);

        it('should respond without an error', function(){
          expect(callback.args[0][0]).toBe(null);
        });

        it('should respond with the rendered html', function(){
          expect(callback.args[0][1].html).toEqual('Hello, world!!');
        });

        it('should respond with the correct version', function(){
          expect(callback.args[0][1].version).toEqual('1.2.123');
        });
      });
    });
  });
});