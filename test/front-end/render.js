'use strict';

var handlebarsCompiledView = 'oc.components=oc.components||{},oc.components["18e2619ff1d06451883f21656affd4c6f02b1ed1"]=function(o,e,c,n,f){return this.compilerInfo=[4,">= 1.0.0"],c=this.merge(c,o.helpers),f=f||{},"Hello world!"};';
var jadeCompiledView = 'oc.components=oc.components||{},oc.components["09227309bca0b1ec1866c547ebb76c74921e85d2"]=function(n){var e,o=[],c=n||{};return function(n){o.push("<span>hello "+jade.escape(null==(e=n)?"":e)+"</span>")}.call(this,"name"in c?c.name:"undefined"!=typeof name?name:void 0),o.join("")};';

describe('oc-client : render', function(){

  describe('when rendering unavailable component', function(){

    var callback;
    beforeEach(function(){
      sinon.stub(head, 'load').yields();
      callback = sinon.spy();
      oc.render({
        src: 'https://my-cdn.com/components/a-component/1.2.123/template.js',
        type: 'handlebars',
        key: '18e2619ff1d06451883f21656affd4c6f02b1ed1'
      }, {}, callback);
    });

    afterEach(function(){
      head.load.restore();
    });

    it('should error', function(){
      expect(callback.called).toBe(true);
      expect(callback.args[0][0]).toEqual('Error getting compiled view: https://my-cdn.com/components/a-component/1.2.123/template.js');
    });
  });
  
  describe('when rendering handlebars component', function(){
    
    describe('when handlebars runtime not loaded', function(){

      var originalHandlebars, originalHeadLoad, callback, headSpy;
      beforeEach(function(){
        originalHandlebars = Handlebars;
        originalHeadLoad = head.load;
        headSpy = sinon.spy();
        Handlebars = undefined;

        head.load = function(url, cb){
          headSpy(url, cb);
          Handlebars = originalHandlebars;
          cb();
        };

        callback = sinon.spy();
        eval(handlebarsCompiledView);
            
        oc.render({
          src: 'https://my-cdn.com/components/a-component/1.2.123/template.js', 
          type: 'handlebars', 
          key: '18e2619ff1d06451883f21656affd4c6f02b1ed1'
        }, {}, callback);
      });

      afterEach(function(){
        Handlebars = originalHandlebars;
        head.load = originalHeadLoad;
      });

      it('should require and wait for it', function(){
        expect(headSpy.called).toBe(true);
        expect(headSpy.args[0][0]).toEqual('https://cdnjs.cloudflare.com/ajax/libs/handlebars.js/3.0.1/handlebars.runtime.js');
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
        headSpy = sinon.spy(head, 'load');
        callback = sinon.spy();
        eval(handlebarsCompiledView);            
        oc.render({
          src: 'https://my-cdn.com/components/a-component/1.2.123/template.js', 
          type: 'handlebars', 
          key: '18e2619ff1d06451883f21656affd4c6f02b1ed1'
        }, {}, callback);
      });

      afterEach(function(){
        head.load.restore();
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
  
  describe('when rendering jade component', function(){
    
    describe('when jade runtime not loaded', function(){

      var originalJade, originalHeadLoad, callback, headSpy;
      beforeEach(function(){
        originalJade = jade;
        originalHeadLoad = head.load;
        headSpy = sinon.spy();
        jade = undefined;

        head.load = function(url, cb){
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
        head.load = originalHeadLoad;
      });

      it('should require and wait for it', function(){
        expect(headSpy.called).toBe(true);
        expect(headSpy.args[0][0]).toEqual('https://cdnjs.cloudflare.com/ajax/libs/jade/1.9.2/runtime.min.js');
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
        headSpy = sinon.spy(head, 'load');
        callback = sinon.spy();
        eval(jadeCompiledView);            
        oc.render({
          src: 'https://my-cdn.com/components/a-component/1.2.456/template.js', 
          type: 'jade', 
          key: '09227309bca0b1ec1866c547ebb76c74921e85d2'
        }, { name: 'James' }, callback);
      });

      afterEach(function(){
        head.load.restore();
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
      headSpy = sinon.spy(head, 'load');
      callback = sinon.spy();
      eval(jadeCompiledView);            
      oc.render({
        src: 'https://my-cdn.com/components/a-component/1.2.789/template.js', 
        type: 'hello!', 
        key: '123456789123456789123456789126456789'
      }, { param: 'blabla' }, callback);
    });

    afterEach(function(){
      head.load.restore();
    });

    it('should respond with error', function(){
      expect(callback.called).toBe(true);
      expect(callback.args[0][0]).toBe('Error loading component: view engine "hello!" not supported');
    });
  });
});