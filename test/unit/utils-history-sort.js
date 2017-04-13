'use strict';

const expect = require('chai').expect;

describe('utils : historySort', () => {

  const historySorted = require('../../src/utils/history-sort');
  const ds = require('../../src/utils/date-stringify');

  describe('when a history of components is provided', () => {
    const history = {
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

    let componentsHistory;

    before(() => {
      componentsHistory = historySorted(history);
    });

    describe('composing the single history object', () => {
      it('should return the publish date of a component', () => {
        expect(componentsHistory[0].lastModified).to.equal(ds(new Date(1491402224345)));
      });

      it('should return the version of a component', () => {
        expect(componentsHistory[0].version).to.equal('1.0.1');
      });

      it('should return the component name', () => {
        expect(componentsHistory[0].name).to.equal('example-component-3');
      });
    });

    describe('sorting the entries by date', () => {
      it('should return the publish date of a component', () => {
        expect(new Date(componentsHistory[0].lastModified)).to.be.above(new Date(componentsHistory[1].lastModified));
      });
    });
  });
});
