'use strict';

var expect = require('chai').expect;
var injectr = require('injectr');
var sinon = require('sinon');
var _ = require('underscore');

describe('registry : routes : helpers : nested-renderer', function(){

  var NestedRenderer = require('../../src/registry/domain/nested-renderer'),
      nestedRenderer,
      renderer;

  var initialise = function(rendererMock, conf){
    renderer = sinon.stub().yields(rendererMock);
    nestedRenderer = new NestedRenderer(renderer, conf || {});
  };

  describe('when rendering nested component', function(){

    describe('when req is not valid', function(){

      describe('when componentName not valid', function(){

        beforeEach(function(){ initialise(); });

        it('should throw an error', function(){
          var f = function(){ nestedRenderer.renderComponent(); };
          expect(f).to.throw('component\'s name is not valid');        
        });
      });

      describe('when componentName empty', function(){

        beforeEach(function(){ initialise(); });

        it('should throw an error', function(){
          var f = function(){ nestedRenderer.renderComponent(''); };
          expect(f).to.throw('component\'s name is not valid');        
        });
      });

      describe('when callback empty', function(){
        beforeEach(function(){ initialise(); });

        it('should throw an error', function(){
          var f = function(){ nestedRenderer.renderComponent('my-component'); };
          expect(f).to.throw('callback is not valid');
        });
      });

      describe('when callback not valid', function(){
        beforeEach(function(){ initialise(); });

        it('should throw an error', function(){
          var f = function(){ nestedRenderer.renderComponent('my-component', {}, 'blarg'); };
          expect(f).to.throw('callback is not valid');
        });
      });

      describe('when requesting a not existent component', function(){
        
        var result, error;
        beforeEach(function(done){
          initialise({
            status: 404,
            response: {
              error: 'Component not found 404'
            }
          });

          nestedRenderer.renderComponent('404-component', {}, function(err, res){
            result = res;
            error = err;
            done();
          });
        });

        it('should return an error in the callback', function(){
          expect(error).to.equal('Component not found 404');
        });
      });
    });

    describe('when req is valid', function(){

      describe('when all params specified', function(){
        
        var result, error;
        beforeEach(function(done){
          
          initialise({
            status: 200,
            response: {
              html: '<b>Some html</b>'
            }
          }, { bla: 'blabla' });

          nestedRenderer.renderComponent('my-component', {
            headers: {
              'accept-language': 'en-GB',
              'accept': 'blargh'
            },
            parameters: { a: 1234 },
            version: '1.2.X'
          }, function(err, res){
            result = res;
            error = err;
            done();
          });
        });

        it('should get the html result', function(){
          expect(result).to.equal('<b>Some html</b>');
        });

        it('should make correct request to renderer', function(){
          expect(renderer.args[0][0]).to.eql({
            name: 'my-component',
            conf: { bla: 'blabla' },
            headers: {
              'accept-language': 'en-GB',
              'accept': 'application/vnd.oc.rendered+json'
            },
            parameters: { a: 1234 },
            version: '1.2.X'
          });
        });

        it('should get no error', function(){
          expect(error).to.be.null;
        });
      });

      describe('when minimal params specified', function(){
        
        var result, error;
        beforeEach(function(done){
          
          initialise({
            status: 200,
            response: {
              html: '<b>Some html</b>'
            }
          }, { bla: 'blabla' });

          nestedRenderer.renderComponent('my-component', function(err, res){
            result = res;
            error = err;
            done();
          });
        });

        it('should get the html result', function(){
          expect(result).to.equal('<b>Some html</b>');
        });

        it('should make correct request to renderer', function(){
          expect(renderer.args[0][0]).to.eql({
            name: 'my-component',
            conf: { bla: 'blabla' },
            headers: {
              'accept': 'application/vnd.oc.rendered+json'
            },
            parameters: {},
            version: ''
          });
        });

        it('should get no error', function(){
          expect(error).to.be.null;
        });
      });
    });
  });

  describe('when rendering nested components', function(){

    describe('when req is not valid', function(){

      describe('when components not valid', function(){

        beforeEach(function(){ initialise(); });

        it('should throw an error', function(){
          var f = function(){ nestedRenderer.renderComponents(); };
          expect(f).to.throw('components is not valid');        
        });
      });

      describe('when components empty', function(){

        beforeEach(function(){ initialise(); });

        it('should throw an error', function(){
          var f = function(){ nestedRenderer.renderComponents([]); };
          expect(f).to.throw('components is not valid');        
        });
      });

      describe('when callback empty', function(){
        beforeEach(function(){ initialise(); });

        it('should throw an error', function(){
          var f = function(){ nestedRenderer.renderComponents([{ name: 'my-component'}]); };
          expect(f).to.throw('callback is not valid');
        });
      });

      describe('when callback not valid', function(){
        beforeEach(function(){ initialise(); });

        it('should throw an error', function(){
          var f = function(){ nestedRenderer.renderComponent('my-component', {}, 'blarg'); };
          expect(f).to.throw('callback is not valid');
        });
      });

      describe('when requesting a not existent component', function(){
        
        var result, error;
        beforeEach(function(done){
          initialise({
            status: 404,
            response: {
              error: 'Component not found 404'
            }
          });

          nestedRenderer.renderComponents([{ name: '404-component' }], {}, function(err, res){
            result = res;
            error = err;
            done();
          });
        });

        it('should return no error in the callback', function(){
          expect(error).to.be.null;
        });

        it('should return error in result callback', function(){
          expect(result).to.eql([new Error('Component not found 404')]);
        });
      });
    });

    describe('when req is valid', function(){

      describe('when all params specified', function(){
        
        var result, error;
        beforeEach(function(done){
          
          initialise({
            status: 200,
            response: {
              html: '<b>Some html</b>'
            }
          }, { bla: 'blabla' });

          nestedRenderer.renderComponents([{
            name: 'my-component',
            parameters: { a: 1234 },
            version: '1.2.X'
          }], {
            headers: {
              'accept-language': 'en-GB',
              'accept': 'blargh'
            }
          }, function(err, res){
            result = res;
            error = err;
            done();
          });
        });

        it('should get the html result', function(){
          expect(result).to.eql(['<b>Some html</b>']);
        });

        it('should make correct request to renderer', function(){
          expect(renderer.args[0][0]).to.eql({
            name: 'my-component',
            conf: { bla: 'blabla' },
            headers: {
              'accept-language': 'en-GB',
              'accept': 'application/vnd.oc.rendered+json'
            },
            parameters: { a: 1234 },
            version: '1.2.X'
          });
        });

        it('should get no error', function(){
          expect(error).to.be.null;
        });
      });

      describe('when minimal params specified', function(){
        
        var result, error;
        beforeEach(function(done){
          
          initialise({
            status: 200,
            response: {
              html: '<b>Some html</b>'
            }
          }, { bla: 'blabla' });

          nestedRenderer.renderComponents([{ name: 'my-component'}], function(err, res){
            result = res;
            error = err;
            done();
          });
        });

        it('should get the html result', function(){
          expect(result).to.eql(['<b>Some html</b>']);
        });

        it('should make correct request to renderer', function(){
          expect(renderer.args[0][0]).to.eql({
            name: 'my-component',
            conf: { bla: 'blabla' },
            headers: { 'accept': 'application/vnd.oc.rendered+json' },
            parameters: {},
            version: ''
          });
        });

        it('should get no error', function(){
          expect(error).to.be.null;
        });
      });
    });
  });
});