'use strict';

const expect = require('chai').expect;
const injectr = require('injectr');

describe('registry : routes : helpers : is-url-discoverable', () => {
  describe('when url responds with application/json', () => {
    let result;
    before(done => {
      const isDiscoverable = injectr(
        '../../dist/registry/routes/helpers/is-url-discoverable.js',
        {
          got: () =>
            Promise.resolve({
              headers: {
                'content-type': 'application/json; charset=utf-8'
              }
            })
        }
      ).default;

      isDiscoverable('https://baseurl.company.com/')
        .then(res => (result = res))
        .finally(done);
    });

    it('should not be discoverable', () => {
      expect(result.isDiscoverable).to.be.false;
    });
  });

  describe('when url responds with text/html', () => {
    let result;
    before(done => {
      const isDiscoverable = injectr(
        '../../dist/registry/routes/helpers/is-url-discoverable.js',
        {
          got: () =>
            Promise.resolve({
              headers: {
                'content-type': 'text/html; charset=utf-8'
              }
            })
        }
      ).default;

      isDiscoverable('https://baseurl.company.com/')
        .then(res => (result = res))
        .finally(done);
    });

    it('should be discoverable', () => {
      expect(result.isDiscoverable).to.be.true;
    });
  });
});
