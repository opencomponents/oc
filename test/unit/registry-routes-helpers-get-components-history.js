'use strict';

const expect = require('chai').expect;

describe('registry : routes : helpers : get-components-history', () => {
  const getComponentsHistory = require('../../src/registry/routes/helpers/get-components-history');
  const ds = require('../../src/utils/date-stringify');

  describe('when components details are provided', () => {
    const details = {
      lastEdit: 1491478634575,
      components: {
        'example-component-1': {
          '1.0.0': {
            publishDate: 1459864868000
          },
          '1.0.1': {
            publishDate: 1467727268000
          }
        },
        'example-component-3': {
          '1.0.0': {
            publishDate: 1491056624678
          },
          '1.0.1': {
            publishDate: 1491402224345
          }
        }
      }
    };

    let componentsHistory;

    before(() => {
      componentsHistory = getComponentsHistory(details);
    });

    describe('composing the single history object', () => {
      it('should return the publish date of a component', () => {
        expect(componentsHistory[0].publishDate).to.equal(
          ds(new Date(1491402224345))
        );
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
        expect(new Date(componentsHistory[0].publishDate)).to.be.above(
          new Date(componentsHistory[1].publishDate)
        );
      });
    });
  });
});
