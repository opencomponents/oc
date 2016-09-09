'use strict';

describe('oc-client : renderNestedComponent', function(){

  var originalConsoleLog = console.log,
      originalRenderByHref = oc.renderByHref,
      htmlBeforeRendering;

  var initialise = function($component, fail){
    htmlBeforeRendering = '';
    
    console.log = function(){};

    oc.renderByHref = function(href, cb){
      htmlBeforeRendering = $component.html();
      cb(fail, {
        html: '<div>content</div>',
        version: '1.0.0',
        name: 'my-component',
        key: '12345678901234567890'
      });
    };
  };

  var cleanup = function(){
    oc.renderByHref = originalRenderByHref;
    console.log = originalConsoleLog;
    delete oc.components;
    oc.renderedComponents = {};
    oc.events.reset();
  };

  describe('when rendering component successfully', function(){

    var $component;

    beforeEach(function(done){
      $component = $('<oc-component href="//oc-registry.com/my-component/"></oc-component>');
      initialise($component);
      oc.renderNestedComponent($component, done);
    });

    afterEach(cleanup);

    it('should show loading message first', function(){
      expect(htmlBeforeRendering).toContain('Loading...');
    });

    it('should inject component html when rendering is done', function(){
      expect($component.html()).toEqual('<div>content</div>');
    });
  });

  describe('when rendering component does not succeed', function(){

    var $component;

    beforeEach(function(done){
      $component = $('<oc-component href="//oc-registry.com/my-component/"></oc-component>');
      initialise($component, 'An error!');
      oc.renderNestedComponent($component, done);
    });

    afterEach(cleanup);

    it('should show loading message first', function(){
      expect(htmlBeforeRendering).toContain('Loading...');
    });

    it('should remove loading message then', function(){
      expect($component.html()).toEqual('');
    });
  });
});