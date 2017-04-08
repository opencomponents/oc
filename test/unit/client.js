'use strict';

var expect = require('chai').expect;
var injectr = require('injectr');
var sinon = require('sinon');

describe('client', function(){

  var validatorStub,
    Client,
    init;

  var initialise = function(){

    validatorStub = sinon.stub();
    Client = injectr('../../client/src/index.js', {
      './validator': { validateConfiguration: validatorStub }
    }, { __dirname: '/something/', console: console });
  };

  describe('when not correctly initialised', function(){    
    before(function(){
      initialise();
      validatorStub.returns({ isValid: false, error: 'argh!' });
      init = function(){ Client(); };
    });

    it('should throw an exception', function(){
      expect(init).to.throw('argh!');
    });
  });
});