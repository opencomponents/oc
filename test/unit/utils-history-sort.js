'use strict';

var expect = require('chai').expect;
var sinon = require('sinon');

describe('utils : historySort', function(){

  var historySorted = require('../../src/utils/history-sort');
  var ds = require('../../src/utils/date-stringify');

  describe('when a history of components is provided', function(){
    var history = {
      lastEdit: 1491478634575,
      components: {
        'example-component-1': [
          {
              lastModified: 1459864868000,
              version: '1.0.0'
          },
          {
              lastModified: 1467727268000,
              version: '1.0.1'
          }
        ],
        'example-component-3': [
            {
                lastModified: 1491056624678,
                version: '1.0.0'
            },
            {
                lastModified: 1491402224345,
                version: '1.0.1'
            }
        ]
      }
    };
    
    var componentsHistory;

    before(function(){
      componentsHistory = historySorted(history);
    });
    
    describe('composing the single history object', function(){
      it('should return the publish date of a component', function(){
        expect(componentsHistory[0].lastModified).to.equal(ds(new Date(1491402224345)));
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
      });
    });
  });
});
