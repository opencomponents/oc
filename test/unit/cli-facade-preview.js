'use strict';

var colors = require('colors/safe');
var expect = require('chai').expect;
var injectr = require('injectr');
var sinon = require('sinon');

describe('cli : facade : preview', function(){

  var opnSpy, logSpy, registryStub;

  var execute = function(error, url){

    opnSpy = sinon.spy();
    registryStub = { getComponentPreviewUrlByUrl: sinon.stub().yields(error, url)};
    logSpy = { log: sinon.spy()};

    var PreviewFacade = injectr('../../cli/facade/preview.js', { opn: opnSpy }),
        previewFacade = new PreviewFacade({ logger: logSpy, registry: registryStub });

    previewFacade({ componentHref: 'http://components.com/component' });
  };

  describe('when previewing not valid component', function(){

    beforeEach(function(){
      execute('404!!!', {});
    });

    it('should not open any preview', function(){
      expect(opnSpy.called).to.be.false;
    });

    it('should show error message', function(){
      expect(logSpy.log.args[0][0]).to.equal(colors.red('The specified path is not a valid component\'s url'));
    });
  });

  describe('when previewing valid component', function(){

    beforeEach(function(){
      execute(null, 'http://registry.com/component/~preview/');
    });

    it('should open /component/~preview/', function(){
      expect(opnSpy.args[0][0]).to.equal('http://registry.com/component/~preview/');
    });
  });
});