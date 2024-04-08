const expect = require('chai').expect;
const injectr = require('injectr');

describe('registry : routes : helpers : get-available-dependencies', () => {
  const getAvailableDependencies = injectr(
    '../../dist/registry/routes/helpers/get-available-dependencies.js',
    {
      'builtin-modules': ['url'],
      '../../domain/require-wrapper': () => (pathToPackageJson) => ({
        version: '1.2.3',
        homepage: `https://${pathToPackageJson.split('/')[0]}.com/`
      })
    }
  ).default;

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
          version: undefined,
          link: 'https://nodejs.org/api/url.html'
        }
      ]);
    });
  });
});
