'use strict';

var expect = require('chai').expect;
var injectr = require('injectr');
var sinon = require('sinon');

describe('client : render-components', function(){

  var renderComponents;

  var initialise = function(getCompiledTemplateStub){

    var RenderComponents = injectr('../../client/src/render-components.js', {
      './get-compiled-template': function(){
        return getCompiledTemplateStub;
      }
    });

    renderComponents = new RenderComponents();
  };

  describe('when compiled template fetch fails', function(){
    
    var errorExample = 'request https://cdn.com/components/1.3.5/template.js failed (' +
      '<?xml version="1.0" encoding="UTF-8"?><Error><Code>AccessDenied</Code><Message>' +
      'Access Denied</Message><RequestId>1234567890</RequestId><HostId>asdfghjklqwertyuiop</HostId></Error>)';
    
    var getCompiledTemplateStub = sinon.stub().yields({
      status: 403,
      response: {
        error: errorExample
      }
    });

    var toDo;

    before(function(done){
      initialise(getCompiledTemplateStub);

      toDo = [{
        render: 'server',
        apiResponse: {
          some: 'properties'
        },
        result: {}
      }];

      renderComponents(toDo, {}, done);
    });

    it('should return an error containing the details', function(){
      expect(toDo[0].result.error.toString()).to.eql('Error: Server-side rendering failed: ' + errorExample + ' (403)');
    });

    it('should schedule it to be rendered as client-side as failover', function(){
      expect(toDo[0].render).to.equal('client');
      expect(toDo[0].failover).to.equal(true);
    });
  });
});