'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const _ = require('underscore');

describe('registry : routes : helpers : nested-renderer', function(){

  const NestedRenderer = require('../../src/registry/domain/nested-renderer');

  let nestedRenderer,
    renderer;

  const initialise = function(rendererMocks, conf){

    if(_.isArray(rendererMocks)){
      renderer = sinon.stub();

      _.each(rendererMocks, function(rendererMock, i){
        renderer.onCall(i).yields(rendererMock);
      });
    } else {
      renderer = sinon.stub().yields(rendererMocks);
    }

    nestedRenderer = new NestedRenderer(renderer, conf || {});
  };

  describe('when rendering nested component', function(){

    describe('when req is not valid', function(){

      describe('when componentName not valid', function(){

        beforeEach(function(){ initialise(); });

        it('should throw an error', function(){
          const f = function(){ nestedRenderer.renderComponent(); };
          expect(f).to.throw('component\'s name is not valid');
        });
      });

      describe('when componentName empty', function(){

        beforeEach(function(){ initialise(); });

        it('should throw an error', function(){
          const f = function(){ nestedRenderer.renderComponent(''); };
          expect(f).to.throw('component\'s name is not valid');
        });
      });

      describe('when callback empty', function(){
        beforeEach(function(){ initialise(); });

        it('should throw an error', function(){
          const f = function(){ nestedRenderer.renderComponent('my-component'); };
          expect(f).to.throw('callback is not valid');
        });
      });

      describe('when callback not valid', function(){
        beforeEach(function(){ initialise(); });

        it('should throw an error', function(){
          const f = function(){ nestedRenderer.renderComponent('my-component', {}, 'blarg'); };
          expect(f).to.throw('callback is not valid');
        });
      });

      describe('when requesting a not existent component', function(){

        let error;
        beforeEach(function(done){
          initialise({
            status: 404,
            response: {
              error: 'Component not found 404'
            }
          });

          nestedRenderer.renderComponent('404-component', {}, function(err){
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

        let result, error;
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

        let result, error;
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
          const f = function(){ nestedRenderer.renderComponents(); };
          expect(f).to.throw('components is not valid');
        });
      });

      describe('when components empty', function(){

        beforeEach(function(){ initialise(); });

        it('should throw an error', function(){
          const f = function(){ nestedRenderer.renderComponents([]); };
          expect(f).to.throw('components is not valid');
        });
      });

      describe('when callback empty', function(){
        beforeEach(function(){ initialise(); });

        it('should throw an error', function(){
          const f = function(){ nestedRenderer.renderComponents([{ name: 'my-component'}]); };
          expect(f).to.throw('callback is not valid');
        });
      });

      describe('when callback not valid', function(){
        beforeEach(function(){ initialise(); });

        it('should throw an error', function(){
          const f = function(){ nestedRenderer.renderComponents(['my-component'], {}, 'blarg'); };
          expect(f).to.throw('callback is not valid');
        });
      });

      describe('when requesting not existent components', function(){

        let result, error;
        beforeEach(function(done){
          initialise({
            status: 404,
            response: {
              error: 'Component not found!'
            }
          });

          nestedRenderer.renderComponents([
            { name: '404-component' },
            { name: 'another-not-existent-component' }
          ], {}, function(err, res){
            result = res;
            error = err;
            done();
          });
        });

        it('should return no error in the callback', function(){
          expect(error).to.be.null;
        });

        it('should return error in result callback', function(){
          expect(result).to.eql([
            new Error('Component not found!'),
            new Error('Component not found!')
          ]);
        });
      });
    });

    describe('when req is valid', function(){

      describe('when all params specified', function(){

        let result, error;
        beforeEach(function(done){

          initialise([
            {
              status: 200,
              response: { html: '<b>Some html</b>' }
            },
            {
              status: 200,
              response: { html: '<b>Some other html</b>' }
            }
          ], { bla: 'blabla' });

          nestedRenderer.renderComponents([{
            name: 'my-component',
            parameters: { x: 123 },
            version: '1.2.X'
          }, {
            name: 'my-other-component',
            parameters: { y: 456 },
            version: '^1.4.6'
          }], {
            headers: {
              'accept-language': 'en-GB',
              'accept': 'blargh'
            },
            parameters: {
              x: 456,
              z: 789
            }
          }, function(err, res){
            result = res;
            error = err;
            done();
          });
        });

        it('should get the html result', function(){
          expect(result).to.eql([
            '<b>Some html</b>',
            '<b>Some other html</b>'
          ]);
        });

        it('should make correct request to renderer', function(){

          expect(renderer.args.length).to.equal(2);

          expect(renderer.args[0][0]).to.eql({
            name: 'my-component',
            conf: { bla: 'blabla' },
            headers: {
              'accept-language': 'en-GB',
              'accept': 'application/vnd.oc.rendered+json'
            },
            parameters: {
              x: 123,
              z: 789
            },
            version: '1.2.X'
          });

          expect(renderer.args[1][0]).to.eql({
            name: 'my-other-component',
            conf: { bla: 'blabla' },
            headers: {
              'accept-language': 'en-GB',
              'accept': 'application/vnd.oc.rendered+json'
            },
            parameters: {
              x: 456,
              y: 456,
              z: 789
            },
            version: '^1.4.6'
          });
        });

        it('should get no error', function(){
          expect(error).to.be.null;
        });
      });

      describe('when minimal params specified', function(){

        let result, error;
        beforeEach(function(done){

          initialise([{
            status: 200,
            response: { html: '<b>Some html</b>' }
          },{
            status: 200,
            response: { html: '<b>Some other html</b>' }
          }], { bla: 'blabla' });

          nestedRenderer.renderComponents([
            { name: 'my-component' },
            { name: 'my-other-component' }
          ], function(err, res){
            result = res;
            error = err;
            done();
          });
        });

        it('should get the html result', function(){
          expect(result).to.eql([
            '<b>Some html</b>',
            '<b>Some other html</b>'
          ]);
        });

        it('should make correct request to renderer', function(){

          expect(renderer.args.length).to.equal(2);

          expect(renderer.args[0][0]).to.eql({
            name: 'my-component',
            conf: { bla: 'blabla' },
            headers: { 'accept': 'application/vnd.oc.rendered+json' },
            parameters: {},
            version: ''
          });

          expect(renderer.args[1][0]).to.eql({
            name: 'my-other-component',
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