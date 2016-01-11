'use strict';

var expect = require('chai').expect;
var path = require('path');
var request = require('request');

describe('registry', function(){

  var registry,
      oc = require('../../index'),
      conf = {          
        local: true,
        path: path.resolve('test/fixtures/components'),
        port: 3030,
        baseUrl: 'http://localhost:3030/',
        env: { name: 'local' },
        verbosity: 0
      };

  before(function(done){
    registry = new oc.Registry(conf);
    registry.start(done);
  });

  after(function(done){
    registry.close(done);
  });

  describe('when initialised with invalid configuration', function(){

    it('should throw an error', function(done){
      var f = function throwsWithNoArgs() {
        var args = {}, wrongRegistry = new oc.Registry(args);
      };
      expect(f).to.throw('Registry configuration is empty');
      done();
    });
  });

  describe('GET /', function(){

    var url = 'http://localhost:3030',
        result;

    before(function(done){
      request(url, function(err, res, body){
        result = JSON.parse(body);
        done();
      });
    });

    it('should respond with the correct href', function(){
      expect(result.href).to.equal('http://localhost:3030/');
    });

    it('should list the components', function(){
      expect(result.components).to.eql([
        'http://localhost:3030/hello-world', 
        'http://localhost:3030/no-containers', 
        'http://localhost:3030/oc-client'
      ]);
    });
  });

  describe('GET /hello-world', function(){

    describe('when Accept header not specified', function(){

      var url = 'http://localhost:3030/hello-world',
          result;

      before(function(done){
        request(url, function(err, res, body){
          result = JSON.parse(body);
          done();
        });
      });

      it('should respond with the correct href', function(){
        expect(result.href).to.eql('http://localhost:3030/hello-world');
      });

      it('should respond with requested version', function(){
        expect(result.requestVersion).to.eql('');
      });
	
      it('should respond with resolved version', function(){
        expect(result.version).to.eql('1.0.0');
      });

      it('should respond with component name', function(){
        expect(result.name).to.eql('hello-world');
      });

      it('should respond with the rendered template', function(){
        expect(result.html).to.exist;
        expect(result.html).to.match(/<oc-component (.*?)>Hello world!<script>(.*?)<\/script><\/oc-component>/g);
      });

      it('should respond with render type = rendered', function(){
        expect(result.renderMode).to.equal('rendered');
      });
    });

    describe('when Accept header set to application/vnd.oc.unrendered+json', function(){

      var url = 'http://localhost:3030/hello-world',
          result;

      before(function(done){
        request({
          url: url,
          headers: {'Accept': 'application/vnd.oc.unrendered+json'}
        }, function(err, res, body){
          result = JSON.parse(body);
          done();
        });
      });

      it('should respond with the correct href', function(){
        expect(result.href).to.eql('http://localhost:3030/hello-world');
      });

      it('should respond with requested version', function(){
        expect(result.requestVersion).to.eql('');
      });
  
      it('should respond with resolved version', function(){
        expect(result.version).to.eql('1.0.0');
      });

      it('should respond with component name', function(){
        expect(result.name).to.eql('hello-world');
      });

      it('should respond with the un-rendered template', function(){
        expect(result.template).to.exist;
      });

      it('should respond with proper render type', function(){
        expect(result.renderMode).to.equal('unrendered');
      });
    });
  });

  describe('GET /no-containers', function(){

    describe('when Accept header not specified', function(){

      var url = 'http://localhost:3030/no-containers',
          result;

      before(function(done){
        request(url, function(err, res, body){
          result = JSON.parse(body);
          done();
        });
      });

      it('should respond with the correct href', function(){
        expect(result.href).to.eql('http://localhost:3030/no-containers');
      });

      it('should respond with the rendered template without the outer container and without render info script', function(){
        expect(result.html).to.exist;
        expect(result.html).to.equal('Hello world!');
      });

      it('should respond with proper render type', function(){
        expect(result.renderMode).to.equal('rendered');
      });
    });
  });

  describe('POST /', function(){

    describe('when body is malformed', function(){

      var url = 'http://localhost:3030/',
          result;

      before(function(done){
        request({
          method: 'POST',
          url: url
        }, function(err, res, body){
          result = JSON.parse(body);
          done();
        });
      });

      it('should respond with error', function() {
        expect(result.error).to.equal('The request body is malformed: components property is missing');
      });
    });

    describe('when body contains two components', function(){

      describe('when Accept header not specified', function(){

        var url = 'http://localhost:3030/',
            result;

        before(function(done){
          request({
            method: 'POST',
            url: url,
            json: true,
            body: {
              components: [
                {name:'hello-world'},
                {name:'no-containers'}
              ]
            }
          }, function(err, res, body){ 
            result = body;
            done();
          });
        });

        it('should respond with two rendered components', function() {
          expect(result[0].html).to.match(/<oc-component (.*?)>Hello world!<script>(.*?)<\/script><\/oc-component>/g);
          expect(result[0].renderMode).to.equal('rendered');
          expect(result[1].html).to.equal('Hello world!');
          expect(result[1].renderMode).to.equal('rendered');
        });
      });

      describe('when Accept header set to application/vnd.oc.unrendered+json', function(){

        var url = 'http://localhost:3030/',
            result;

        before(function(done){
          request({
            method: 'POST',
            url: url,
            headers: {'Accept': 'application/vnd.oc.unrendered+json'},
            json: true,
            body: {
              components: [
                {name:'hello-world'},
                {name:'no-containers'}
              ]
            }
          }, function(err, res, body){ 
            result = body;
            done();
          });
        });

        it('should respond with two unrendered components', function() {
          expect(result[0].template).to.exist;
          expect(result[0].renderMode).to.equal('unrendered');
          expect(result[1].template).to.exist;
          expect(result[1].renderMode).to.equal('unrendered');
        });
      });
    });   
  });
});
