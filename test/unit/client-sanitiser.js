'use strict';

var expect = require('chai').expect;
var injectr = require('injectr');

describe('client : sanitiser', function(){

  var sanitiser = injectr('../../client/src/sanitiser.js', {
    '../package': { 
      version: '1.2.3'
    }
  }, { process: 
    {
      version: 'v0.10.40',
      platform: 'darwin',
      arch: 'x64'
    }
  });

  describe('when sanitising global rendering options', function(){

    describe('when user-agent not already set', function(){

      var result = sanitiser.sanitiseGlobalRenderOptions({}, {});

      it('should set oc-client user-agent', function(){
        expect(result.headers['user-agent']).to.equal('oc-client-1.2.3/v0.10.40-darwin-x64');
      });
    });
  });
});