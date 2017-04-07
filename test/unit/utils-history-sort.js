'use strict';

var expect = require('chai').expect;
var sinon = require('sinon');

describe.only('utils : historySort', function(){

  var historySorted = require('../../src/utils/history-sort');

  describe('when a history of components is provided', function(){
    var history = require('../../src/registry/history.json');
    var componentsHistory;

    before(function(){
      componentsHistory = historySorted(history);
    });
    
    describe('composing the single history object', function(){
      it('should return the publish date of a component', function(){
        expect(componentsHistory[0].lastModified).to.equal('2017/04/05 15:23:44');
      });
      
      it('should return the version of a component', function(){
        expect(componentsHistory[0].version).to.equal('1.0.1');
      });
      
      it('should return the component name', function(){
        expect(componentsHistory[0].name).to.equal('example-component-3');
      });
    });
    
    describe('sorting the entries by date', function(){
      it('should return the publish date of a component', function(){
        expect(new Date(componentsHistory[0].lastModified)).to.be.above(new Date(componentsHistory[1].lastModified));
        expect(new Date(componentsHistory[1].lastModified)).to.be.above(new Date(componentsHistory[2].lastModified));
      });
    });
  });
});
