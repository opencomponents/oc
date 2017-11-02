'use strict';

const expect = require('chai').expect;
const oc = require('../../src/index');
const path = require('path');
const request = require('minimal-request');

describe('registry (ui interface)', () => {
  let registry, result, error, headers;

  const next = done => (e, r, d) => {
    error = e;
    result = r;
    headers = d.response.headers;
    done();
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
    registry = new oc.Registry(configuration);
    registry.start(cb);
  };

  before(done => initializeRegistry(conf, done));

  after(done => registry.close(done));

  describe('GET / with Accept: text/html', () => {
    before(done => {
      request(
        {
          url: 'http://localhost:3030',
          headers: { accept: 'text/html' }
        },
        next(done)
      );
    });

    it('should not error', () => {
      expect(error).to.be.null;
    });

    it('should respond with html result', () => {
      expect(headers['content-type']).to.equal('text/html; charset=utf-8');
      expect(result).to.match(/<!DOCTYPE html><html>/);
    });
  });

  describe('GET /oc-client/~info with Accept: text/html', () => {
    before(done => {
      request(
        {
          url: 'http://localhost:3030/oc-client/~info',
          headers: { accept: 'text/html' }
        },
        next(done)
      );
    });

    it('should not error', () => {
      expect(error).to.be.null;
    });

    it('should respond with html result', () => {
      expect(headers['content-type']).to.equal('text/html; charset=utf-8');
      expect(result).to.match(/<!DOCTYPE html><html>/);
    });
  });
});
