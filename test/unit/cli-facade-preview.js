'use strict';

const expect = require('chai').expect;
const injectr = require('injectr');
const sinon = require('sinon');

describe('cli : facade : preview', function(){

  let opnSpy, logSpy, registryStub;

  const execute = function(error, url){

    opnSpy = sinon.spy();
    registryStub = { getComponentPreviewUrlByUrl: sinon.stub().yields(error, url)};
    logSpy = { err: sinon.spy()};

    const PreviewFacade = injectr('../../src/cli/facade/preview.js', { opn: opnSpy }),
      previewFacade = new PreviewFacade({ logger: logSpy, registry: registryStub });

    previewFacade({ componentHref: 'http://components.com/component' }, function(){});
  };

  describe('when previewing not valid component', function(){

    beforeEach(function(){
      execute('404!!!', {});
    });

    it('should not open any preview', function(){
      expect(opnSpy.called).to.be.false;
    });

    it('should show error message', function(){
      expect(logSpy.err.args[0][0]).to.equal('The specified path is not a valid component\'s url');
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