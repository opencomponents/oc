'use strict';

var expect = require('chai').expect;
var sinon = require('sinon');

describe('utils : dateStringify', function(){

  var dateStringified = require('../../utils/date-stringify');

  describe('when the date is provided', function(){
    var anyValidDate = new Date(1442592664035);
    var dateString;

    before(function(){
      var mockedDate = new Date();
      sinon.stub(mockedDate, 'getFullYear').returns(2015);
      sinon.stub(mockedDate, 'getMonth').returns(8);
      sinon.stub(mockedDate, 'getDate').returns(18);
      sinon.stub(mockedDate, 'getHours').returns(17);
      sinon.stub(mockedDate, 'getMinutes').returns(11);
      sinon.stub(mockedDate, 'getSeconds').returns(4);

      dateString = dateStringified(mockedDate);
    });

    it('should return the correct stringified date', function(){
      expect(dateString).to.equal('2015/09/18 17:11:04');
    });
  });

  describe('when the provided data is not valid', function(){
    var anyNotValidData = 'Not a date';
    var dateString = dateStringified(anyNotValidData);

    it('should return empty string', function(){
      expect(dateString).to.be.empty;
    });
  });
});
