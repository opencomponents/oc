'use strict';

var colors = require('colors');
var expect = require('chai').expect;
var sinon = require('sinon');

describe('cli : facade : init', function(){

  var logSpy = {},
      InitFacade = require('../../cli/facade/init'),
      Local = require('../../cli/domain/local'),
      local = new Local({ logger: { log: function(){} } }),
      initFacade = new InitFacade({ local: local, logger: logSpy });

  var execute = function(componentName, templateType){
    logSpy.log = sinon.spy();
    initFacade({ componentName: componentName, templateType: templateType });
  };

  describe('when initialising a new component', function(){

    describe('when the component is an empty string', function(){

      beforeEach(function(){
        execute(' ');
      });

      it('should show an error', function(){
        expect(logSpy.log.args[0][0]).to.equal('An error happened when initialising the component: the name is not valid. Allowed characters are alphanumeric, _, -'.red);
      });
    });

    describe('when the component has a non valid name', function(){

      beforeEach(function(){
        execute('hello-asd$qwe:11', 'handlebars');
      });

      it('should show an error', function(){
        expect(logSpy.log.args[0][0]).to.equal('An error happened when initialising the component: the name is not valid. Allowed characters are alphanumeric, _, -'.red);
      });
    });

    describe('when the template is of a non valid type', function(){
        beforeEach(function(){
          execute('valid-component', 'invalid-type');
        });

        it('should show an error', function(){
          var expected = 'An error happened when initialising the component: the template is not valid. Allowed values are handlebars and jade';
          expect(logSpy.log.args[0][0]).to.equal(expected.red);
        });
    });

    describe('when an error happens', function(){

      beforeEach(function(){
        sinon.stub(local, 'init').yields('nope!');
        execute('the-best-component', 'handlebars');
      });

      afterEach(function(){
        local.init.restore();
      });

      it('should show an error', function(){
        expect(logSpy.log.args[0][0]).to.equal('An error happened when initialising the component: nope!'.red);
      });
    });

    describe('when succeeds', function(){

      beforeEach(function(){
        sinon.stub(local, 'init').yields(null, 'yes man');
        execute('the-best-component', 'jade');
      });

      afterEach(function(){
        local.init.restore();
      });

      it('should show a message', function(){
        expect(logSpy.log.args[0][0]).to.equal('Component "the-best-component" created'.green);
      });
    });
  });
});
