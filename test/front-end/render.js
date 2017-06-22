'use strict';

var handlebars3CompiledView = 'oc.components=oc.components||{},oc.components["46ee85c314b371cac60471cef5b2e2e6c443dccf"]={compiler:[6,">= 2.0.0-beta.1"],main:function(){return"Hello world!"},useData:!0};';
var handlebarsCompiledView = 'oc.components=oc.components||{},oc.components["46ee85c314b371cac60471cef5b2e2e6c443dccf"]={compiler:[7,">= 4.0.0"],main:function(){return"Hello world!"},useData:!0};';
var emojiCompiledView = 'oc.components=oc.components||{},oc.components["46ee85c314b371cac60471cef5b2e2e6c443dccc"]=function(){return "😎";};';
var jadeCompiledView = 'oc.components=oc.components||{},oc.components["09227309bca0b1ec1866c547ebb76c74921e85d2"]=function(n){var e,o=[],c=n||{};return function(n){o.push("<span>hello "+jade.escape(null==(e=n)?"":e)+"</span>")}.call(this,"name"in c?c.name:"undefined"!=typeof name?name:void 0),o.join("")};';

describe('oc-client : render', function(){

  describe('when rendering unavailable component', function(){

    var callback;
    beforeEach(function(){
      sinon.stub(ljs, 'load').yields();
      callback = sinon.spy();
      oc.render({
        src: 'https://my-cdn.com/components/a-component/1.2.123/template.js',
        type: 'handlebars',
        key: '46ee85c314b371cac60471cef5b2e2e6c443dccf'
      }, {}, callback);
    });

    afterEach(function(){
      ljs.load.restore();
    });

    it('should error', function(){
      expect(callback.called).toBe(true);
      expect(callback.args[0][0]).toEqual('Error getting compiled view: https://my-cdn.com/components/a-component/1.2.123/template.js');
    });
  });

  describe('when rendering handlebars component', function(){

    describe('when handlebars runtime not loaded', function(){

      var originalHandlebars, originalLjsLoad, callback, headSpy;

      beforeEach(function(){
        originalHandlebars = Handlebars;
        originalLjsLoad = ljs.load;
        headSpy = sinon.spy();
        Handlebars = undefined;

        ljs.load = function(url, cb){
          headSpy(url, cb);
          Handlebars = originalHandlebars;
          cb();
        };

        callback = sinon.spy();
        eval(handlebarsCompiledView);

        oc.render({
          src: 'https://my-cdn.com/components/a-component/1.2.123/template.js',
          type: 'handlebars',
          key: '46ee85c314b371cac60471cef5b2e2e6c443dccf'
        }, {}, callback);
      });

      afterEach(function(){
        Handlebars = originalHandlebars;
        ljs.load = originalLjsLoad;
      });

      it('should require and wait for it', function(){
        expect(headSpy.called).toBe(true);
        expect(headSpy.args[0][0]).toEqual('https://cdnjs.cloudflare.com/ajax/libs/handlebars.js/4.0.6/handlebars.runtime.min.js');
      });

      it('should render the component', function(){
        expect(callback.called).toBe(true);
        expect(callback.args[0][0]).toBe(null);
        expect(callback.args[0][1]).toEqual('Hello world!');
      });
    });

    describe('when handlebars runtime loaded', function(){

      var callback, headSpy;
      beforeEach(function(){
        headSpy = sinon.spy(ljs, 'load');
        callback = sinon.spy();
        eval(handlebarsCompiledView);
        oc.render({
          src: 'https://my-cdn.com/components/a-component/1.2.123/template.js',
          type: 'handlebars',
          key: '46ee85c314b371cac60471cef5b2e2e6c443dccf'
        }, {}, callback);
      });

      afterEach(function(){
        ljs.load.restore();
      });

      it('should not require it', function(){
        expect(headSpy.called).toBe(false);
      });

      it('should render the component', function(){
        expect(callback.called).toBe(true);
        expect(callback.args[0][0]).toBe(null);
        expect(callback.args[0][1]).toEqual('Hello world!');
      });
    });
  });

  describe('when handlebars runtime loaded and rendering a handlebars3 component', function(){

    var callback, originalConsolelog = console.log;
    beforeEach(function(){
      console.log = function(){};
      callback = sinon.spy();
      eval(handlebars3CompiledView);
      oc.render({
        src: 'https://my-cdn.com/components/a-component/1.2.123/template.js',
        type: 'handlebars',
        key: '46ee85c314b371cac60471cef5b2e2e6c443dccf'
      }, {}, callback);
    });

    afterEach(function(){
      console.log = originalConsolelog;
    });

    it('should return the error', function(){ console.log(callback.args);
      expect(callback.called).toBe(true);
      expect(callback.args[0][0]).toContain('Template was precompiled with an older version of Handlebars than the current runtime');
    });
  });

  describe('when rendering jade component', function(){

    describe('when jade runtime not loaded', function(){

      var originalJade, originalLjsLoad, callback, headSpy;
      beforeEach(function(){
        originalJade = jade;
        originalLjsLoad = ljs.load;
        headSpy = sinon.spy();
        jade = undefined;

        ljs.load = function(url, cb){
          headSpy(url, cb);
          jade = originalJade;
          cb();
        };

        callback = sinon.spy();
        eval(jadeCompiledView);

        oc.render({
          src: 'https://my-cdn.com/components/a-component/1.2.456/template.js',
          type: 'jade',
          key: '09227309bca0b1ec1866c547ebb76c74921e85d2'
        }, { name: 'Michael' }, callback);
      });

      afterEach(function(){
        jade = originalJade;
        ljs.load = originalLjsLoad;
      });

      it('should require and wait for it', function(){
        expect(headSpy.called).toBe(true);
        expect(headSpy.args[0][0]).toEqual('https://cdnjs.cloudflare.com/ajax/libs/jade/1.11.0/runtime.min.js');
      });

      it('should render the component', function(){
        expect(callback.called).toBe(true);
        expect(callback.args[0][0]).toBe(null);
        expect(callback.args[0][1]).toEqual('<span>hello Michael</span>');
      });
    });

    describe('when jade runtime loaded', function(){

      var callback, headSpy;
      beforeEach(function(){
        headSpy = sinon.spy(ljs, 'load');
        callback = sinon.spy();
        eval(jadeCompiledView);
        oc.render({
          src: 'https://my-cdn.com/components/a-component/1.2.456/template.js',
          type: 'jade',
          key: '09227309bca0b1ec1866c547ebb76c74921e85d2'
        }, { name: 'James' }, callback);
      });

      afterEach(function(){
        ljs.load.restore();
      });

      it('should not require it', function(){
        expect(headSpy.called).toBe(false);
      });

      it('should render the component', function(){
        expect(callback.called).toBe(true);
        expect(callback.args[0][0]).toBe(null);
        expect(callback.args[0][1]).toEqual('<span>hello James</span>');
      });
    });
  });

  describe('when rendering unsupported component', function(){

    var callback, headSpy;
    beforeEach(function(){
      headSpy = sinon.spy(ljs, 'load');
      callback = sinon.spy();
      eval(jadeCompiledView);
      oc.render({
        src: 'https://my-cdn.com/components/a-component/1.2.789/template.js',
        type: 'hello!',
        key: '123456789123456789123456789126456789'
      }, { param: 'blabla' }, callback);
    });

    afterEach(function(){
      ljs.load.restore();
    });

    it('should respond with error', function(){
      expect(callback.called).toBe(true);
      expect(callback.args[0][0]).toBe('Error loading component: view engine "hello!" not supported');
    });
  });

  describe('when adding support to new template', function(){
    describe('and the new template client-dependency is not loaded', function(){
      var originalEmoji, jEmoji, originalLjsLoad, callback, headSpy;
      beforeEach(function(){
        originalLjsLoad = ljs.load;
        headSpy = sinon.spy();

        ljs.load = function(url, cb){
          headSpy(url, cb);
          cb();
        };

        callback = sinon.spy();
        eval(emojiCompiledView);

        oc.registerTemplates({
          type:'emoji',
          externals: [
            { global: 'jEmoji', url: 'http://cdn.staticfile.org/emoji/0.2.2/emoji.js' }
          ]
        });

        oc.render({
          src: 'https://my-cdn.com/components/a-component/1.2.456/template.js',
          type: 'emoji',
          key: '46ee85c314b371cac60471cef5b2e2e6c443dccc'
        }, {}, callback);
      });

      afterEach(function(){
        ljs.load = originalLjsLoad;
      });

      it('should require and wait for it', function(){
        expect(headSpy.called).toBe(true);
        expect(headSpy.args[0][0]).toEqual('http://cdn.staticfile.org/emoji/0.2.2/emoji.js');
      });

      it('should render the component', function(){
        expect(callback.called).toBe(true);
        expect(callback.args[0][0]).toBe(null);
        expect(callback.args[0][1]).toEqual('😎');
      });
    });
  });
});