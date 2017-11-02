'use strict';

const expect = require('chai').expect;
const injectr = require('injectr');

describe('registry : routes : helpers : get-available-dependencies', () => {
  const getAvailableDependencies = injectr(
    '../../src/registry/routes/helpers/get-available-dependencies.js',
    {
      'builtin-modules': ['url'],
      '../../domain/require-wrapper': () => pathToPackageJson => ({
        version: '1.2.3',
        homepage: `https://${pathToPackageJson.split('/')[0]}.com/`
      })
    }
  );

  describe('happy path', () => {
    let result;
    before(() => (result = getAvailableDependencies(['moment', 'url'])));

    it('should map to structured view-model', () => {
      expect(result).to.eql([
        {
          core: false,
          name: 'moment',
          version: '1.2.3',
          link: 'https://moment.com/'
        },
        {
          core: true,
          name: 'url',
          version: false,
          link: 'https://nodejs.org/api/url.html'
        }
      ]);
    });
  });
});
