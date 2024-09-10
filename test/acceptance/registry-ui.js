const expect = require('chai').expect;
const oc = require('../../dist/index');
const path = require('node:path');
const { request } = require('undici');

describe('registry (ui interface)', () => {
  let registry;
  let result;
  let error;
  let headers;

  const next = (promise, done) => {
    promise
      .then(async (r) => {
        headers = r.headers;
        result = await r.body.text();
      })
      .catch((e) => {
        error = e;
      })
      .finally(done);
  };

  const conf = {
    local: true,
    path: path.resolve('test/fixtures/components'),
    port: 3030,
    baseUrl: 'http://localhost:3030/',
    env: { name: 'local' },
    verbosity: 0,
    dependencies: ['lodash.isequal'],
    discovery: true
  };

  const initializeRegistry = (configuration, cb) => {
    registry = oc.Registry(configuration);
    registry.start(cb);
  };

  before((done) => initializeRegistry(conf, done));

  after((done) => registry.close(done));

  describe('GET / with Accept: text/html', () => {
    before((done) => {
      next(
        request('http://localhost:3030', {
          headers: { accept: 'text/html' }
        }),
        done
      );
    });

    it('should not error', () => {
      expect(error).to.be.undefined;
    });

    it('should respond with html result', () => {
      expect(headers['content-type']).to.equal('text/html; charset=utf-8');
      expect(result).to.match(/<!DOCTYPE html><html>/);
    });
  });

  describe('GET /oc-client/~info with Accept: text/html', () => {
    before((done) => {
      next(
        request('http://localhost:3030/oc-client/~info', {
          headers: { accept: 'text/html' }
        }),
        done
      );
    });

    it('should not error', () => {
      expect(error).to.be.undefined;
    });

    it('should respond with html result', () => {
      expect(headers['content-type']).to.equal('text/html; charset=utf-8');
      expect(result).to.match(/<!DOCTYPE html><html>/);
    });
  });
});
