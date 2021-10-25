'use strict';

const expect = require('chai').expect;
const oc = require('../../dist/index');
const path = require('path');
const got = require('got');

describe('registry (ui interface)', () => {
  let registry;
  let result;
  let error;
  let headers;

  const next = (promise, done) => {
    promise
      .then(r => {
        headers = r.headers;
        result = r.body;
      })
      .catch(e => (error = e))
      .finally(done);
  };

  const conf = {
    local: true,
    path: path.resolve('test/fixtures/components'),
    port: 3030,
    baseUrl: 'http://localhost:3030/',
    env: { name: 'local' },
    verbosity: 0,
    dependencies: ['lodash'],
    discovery: true
  };

  const initializeRegistry = (configuration, cb) => {
    registry = oc.Registry(configuration);
    registry.start(cb);
  };

  before(done => initializeRegistry(conf, done));

  after(done => registry.close(done));

  describe('GET / with Accept: text/html', () => {
    before(done => {
      next(
        got('http://localhost:3030', {
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
    before(done => {
      next(
        got('http://localhost:3030/oc-client/~info', {
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
