'use strict';

const expect = require('chai').expect;

describe('cli : domain : url-parser', () => {
  let parsed;
  const execute = function(url, returnVersion) {
    const urlParser = require('../../src/cli/domain/url-parser');

    parsed = urlParser.parse({
      href: url,
      requestVersion: returnVersion
    });
  };

  describe('when parsing http://www.registry.com/api/v2/component-name', () => {
    before(() => {
      execute('http://www.registry.com/api/v2/component-name', '');
    });

    it('name should be component-name', () => {
      expect(parsed.name).to.equal('component-name');
    });

    it('version should be blank', () => {
      expect(parsed.version).to.equal('');
    });

    it('registryUrl should be http://www.registry.com/api/v2/', () => {
      expect(parsed.registryUrl).to.equal('http://www.registry.com/api/v2/');
    });

    it('parameters should be {}', () => {
      expect(parsed.parameters).to.eql({});
    });

    it('clientHref should be http://www.registry.com/api/v2/oc-client/client.js', () => {
      expect(parsed.clientHref).to.equal(
        'http://www.registry.com/api/v2/oc-client/client.js'
      );
    });
  });

  describe('when parsing http://www.registry.com/component-name/~1.0.0/?hello=world', () => {
    before(() => {
      execute(
        'http://www.registry.com/component-name/~1.0.0/?hello=world',
        '~1.0.0'
      );
    });

    it('name should be component-name', () => {
      expect(parsed.name).to.equal('component-name');
    });

    it('version should be ~1.0.0', () => {
      expect(parsed.version).to.equal('~1.0.0');
    });

    it('registryUrl should be http://www.registry.com/', () => {
      expect(parsed.registryUrl).to.equal('http://www.registry.com/');
    });

    it("parameters should be { hello: 'world'}", () => {
      expect(parsed.parameters).to.eql({ hello: 'world' });
    });

    it('clientHref should be http://www.registry.com/oc-client/client.js', () => {
      expect(parsed.clientHref).to.equal(
        'http://www.registry.com/oc-client/client.js'
      );
    });
  });

  describe('when parsing http://www.registry.com/12345/~1.0.0?hello=world', () => {
    before(() => {
      execute('http://www.registry.com/12345/~1.0.0?hello=world', '~1.0.0');
    });

    it('name should be 12345', () => {
      expect(parsed.name).to.equal('12345');
    });

    it('version should be ~1.0.0', () => {
      expect(parsed.version).to.equal('~1.0.0');
    });

    it('registryUrl should be http://www.registry.com/', () => {
      expect(parsed.registryUrl).to.equal('http://www.registry.com/');
    });

    it("parameters should be { hello: 'world'}", () => {
      expect(parsed.parameters).to.eql({ hello: 'world' });
    });

    it('clientHref should be http://www.registry.com/oc-client/client.js', () => {
      expect(parsed.clientHref).to.equal(
        'http://www.registry.com/oc-client/client.js'
      );
    });
  });
});
