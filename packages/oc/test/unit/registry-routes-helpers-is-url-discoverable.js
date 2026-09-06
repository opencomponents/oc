const expect = require('chai').expect;
const injectr = require('injectr');

describe('registry : routes : helpers : is-url-discoverable', () => {
  describe('when url responds with application/json', () => {
    let result;
    before((done) => {
      const isDiscoverable = injectr(
        '../../dist/registry/routes/helpers/is-url-discoverable.js',
        {
          undici: {
            request: () =>
              Promise.resolve({
                headers: {
                  'content-type': 'application/json; charset=utf-8'
                }
              })
          }
        },
        { process }
      ).default;

      isDiscoverable('https://baseurl.company.com/')
        .then((res) => {
          result = res;
        })
        .finally(done);
    });

    it('should not be discoverable', () => {
      expect(result.isDiscoverable).to.be.false;
    });
  });

  describe('when url responds with text/html', () => {
    let result;
    before((done) => {
      const isDiscoverable = injectr(
        '../../dist/registry/routes/helpers/is-url-discoverable.js',
        {
          undici: {
            request: () =>
              Promise.resolve({
                headers: {
                  'content-type': 'text/html; charset=utf-8'
                }
              })
          }
        },
        { process }
      ).default;

      isDiscoverable('https://other-baseurl.company.com/')
        .then((res) => {
          result = res;
        })
        .finally(done);
    });

    it('should be discoverable', () => {
      expect(result.isDiscoverable).to.be.true;
    });
  });

  describe('memoization per baseUrl', () => {
    const loadHelper = (requestStub) =>
      injectr(
        '../../dist/registry/routes/helpers/is-url-discoverable.js',
        { undici: { request: requestStub } },
        { process }
      );

    it('issues ONE probe for repeated calls with the same baseUrl', async () => {
      let calls = 0;
      const helper = loadHelper(() => {
        calls++;
        return Promise.resolve({
          headers: { 'content-type': 'text/html; charset=utf-8' }
        });
      });

      const first = await helper.default('https://memo-one.company.com/');
      const second = await helper.default('https://memo-one.company.com/');

      expect(first.isDiscoverable).to.be.true;
      expect(second.isDiscoverable).to.be.true;
      expect(calls).to.equal(1);
    });

    it('dedupes concurrent in-flight probes onto a single request', async () => {
      let calls = 0;
      let release;
      const gate = new Promise((resolve) => {
        release = resolve;
      });
      const helper = loadHelper(() => {
        calls++;
        return gate.then(() => ({
          headers: { 'content-type': 'text/html; charset=utf-8' }
        }));
      });

      const pending = Promise.all([
        helper.default('https://memo-inflight.company.com/'),
        helper.default('https://memo-inflight.company.com/')
      ]);
      release();
      const [first, second] = await pending;

      expect(first.isDiscoverable).to.be.true;
      expect(second.isDiscoverable).to.be.true;
      expect(calls).to.equal(1);
    });

    it('probes again for a different baseUrl', async () => {
      let calls = 0;
      const helper = loadHelper(() => {
        calls++;
        return Promise.resolve({
          headers: { 'content-type': 'text/html; charset=utf-8' }
        });
      });

      await helper.default('https://memo-a.company.com/');
      await helper.default('https://memo-b.company.com/');

      expect(calls).to.equal(2);
    });

    it('clearDiscoverabilityCache(url) forces a re-probe for that url', async () => {
      let calls = 0;
      const helper = loadHelper(() => {
        calls++;
        return Promise.resolve({
          headers: { 'content-type': 'text/html; charset=utf-8' }
        });
      });

      await helper.default('https://memo-clear-one.company.com/');
      expect(calls).to.equal(1);
      helper.clearDiscoverabilityCache('https://memo-clear-one.company.com/');
      await helper.default('https://memo-clear-one.company.com/');
      expect(calls).to.equal(2);
    });

    it('clearDiscoverabilityCache() clears all entries', async () => {
      let calls = 0;
      const helper = loadHelper(() => {
        calls++;
        return Promise.resolve({
          headers: { 'content-type': 'text/html; charset=utf-8' }
        });
      });

      await helper.default('https://memo-clear-all-a.company.com/');
      await helper.default('https://memo-clear-all-b.company.com/');
      expect(calls).to.equal(2);
      helper.clearDiscoverabilityCache();
      await helper.default('https://memo-clear-all-a.company.com/');
      expect(calls).to.equal(3);
    });

    it('OC_DISCOVERABILITY_NO_CACHE=1 forces a re-probe every call', async () => {
      let calls = 0;
      const helper = loadHelper(() => {
        calls++;
        return Promise.resolve({
          headers: { 'content-type': 'text/html; charset=utf-8' }
        });
      });

      process.env.OC_DISCOVERABILITY_NO_CACHE = '1';
      try {
        await helper.default('https://memo-nocache.company.com/');
        await helper.default('https://memo-nocache.company.com/');
      } finally {
        delete process.env.OC_DISCOVERABILITY_NO_CACHE;
      }
      expect(calls).to.equal(2);
    });
  });
});
