'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');

describe('utils : dateStringify', () => {
  const dateStringified = require('../../src/utils/date-stringify');

  describe('when the date is provided', () => {
    let dateString;

    before(() => {
      const mockedDate = new Date();
      sinon.stub(mockedDate, 'getFullYear').returns(2015);
      sinon.stub(mockedDate, 'getMonth').returns(8);
      sinon.stub(mockedDate, 'getDate').returns(18);
      sinon.stub(mockedDate, 'getHours').returns(17);
      sinon.stub(mockedDate, 'getMinutes').returns(11);
      sinon.stub(mockedDate, 'getSeconds').returns(4);

      dateString = dateStringified(mockedDate);
    });

    it('should return the correct stringified date', () => {
      expect(dateString).to.equal('2015/09/18 17:11:04');
    });
  });

  describe('when the provided data is not valid', () => {
    const anyNotValidData = 'Not a date';
    const dateString = dateStringified(anyNotValidData);

    it('should return empty string', () => {
      expect(dateString).to.be.empty;
    });
  });
});
