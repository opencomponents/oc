'use strict';

const expect = require('chai').expect;
const _ = require('lodash');

describe('registry : domain : options-sanitiser', () => {
  const sanitise = require('../../src/registry/domain/options-sanitiser');

  describe('when options is empty', () => {
    const options = { baseUrl: 'http://my-registry.com' };
    const defaults = {
      prefix: '/',
      tempDir: './temp/',
      hotReloading: false,
      verbosity: 0,
      customHeadersToSkipOnWeakVersion: [],
      timeout: 120000
    };

    _.each(defaults, (value, property) => {
      it(`should set ${property} to ${JSON.stringify(value)}`, () => {
        expect(sanitise(options)[property]).to.eql(value);
      });
    });
  });

  describe('when verbosity is provided', () => {
    const options = { baseUrl: 'http://my-registry.com', verbosity: 3 };

    it('should leave value untouched', () => {
      expect(sanitise(options).verbosity).to.equal(3);
    });
  });

  describe('customHeadersToSkipOnWeakVersion', () => {
    describe('when it contains valid elements', () => {
      const options = {
        baseUrl: 'http://my-registry.com',
        customHeadersToSkipOnWeakVersion: ['header1', 'HeAdEr-TwO', 'HEADER3']
      };

      it('should convert the array elements to lower case', () => {
        expect(sanitise(options).customHeadersToSkipOnWeakVersion).to.be.eql([
          'header1',
          'header-two',
          'header3'
        ]);
      });
    });
  });

  describe('fallbackRegistryUrl', () => {
    describe("when fallbackRegistryUrl doesn't contain / at the end of url", () => {
      const options = {
        fallbackRegistryUrl: 'http://test-url.com',
        baseUrl: 'http://my-registry.com'
      };

      it('should add `/` at the end of url', () => {
        expect(sanitise(options).fallbackRegistryUrl).to.be.eql(
          'http://test-url.com/'
        );
      });
    });

    describe('when fallbackRegistryUrl contains `/` at the end of url', () => {
      const options = {
        fallbackRegistryUrl: 'http://test-url.com/',
        baseUrl: 'http://my-registry.com'
      };

      it('should not modify fallbackRegistryUrl url', () => {
        expect(sanitise(options).fallbackRegistryUrl).to.be.eql(
          'http://test-url.com/'
        );
      });
    });
  });

  describe('prefix and baseUrl sanitization', () => {
    const prefixAndBaseUrlScenarios = [
      {
        options: { baseUrl: 'http://my-registry.com' },
        expected: { baseUrl: 'http://my-registry.com/', prefix: '/' }
      },
      {
        options: { baseUrl: 'http://my-registry.com/' },
        expected: { baseUrl: 'http://my-registry.com/', prefix: '/' }
      },
      {
        options: { prefix: '/', baseUrl: 'http://my-registry.com' },
        expected: { baseUrl: 'http://my-registry.com/', prefix: '/' }
      },
      {
        options: { prefix: '/', baseUrl: 'http://my-registry.com/' },
        expected: { baseUrl: 'http://my-registry.com/', prefix: '/' }
      },
      {
        options: { prefix: '/-/', baseUrl: 'http://my-registry.com' },
        expected: { baseUrl: 'http://my-registry.com/-/', prefix: '/-/' }
      },
      {
        options: { prefix: '/-/', baseUrl: 'http://my-registry.com/' },
        expected: { baseUrl: 'http://my-registry.com/-/', prefix: '/-/' }
      },
      {
        options: { prefix: '/-/', baseUrl: 'http://my-registry.com/-/' },
        expected: { baseUrl: 'http://my-registry.com/-/', prefix: '/-/' }
      }
    ];

    it('should support various scenarios correctly', () => {
      prefixAndBaseUrlScenarios.forEach(scenario => {
        expect(sanitise(scenario.options).prefix).to.equal(
          scenario.expected.prefix
        );
        expect(sanitise(scenario.options).baseUrl).to.equal(
          scenario.expected.baseUrl
        );
      });
    });
  });

  describe('when env', () => {
    describe('is provided', () => {
      const options = { baseUrl: 'dummy', env: { value: 'test' } };
      it('should not modify it', () => {
        expect(sanitise(options).env).to.deep.equal({ value: 'test' });
      });
    });

    describe('is not provided', () => {
      const options = { baseUrl: 'dummy' };
      it('should initialize it as an empty {}', () => {
        expect(sanitise(options).env).to.deep.equal({});
      });
    });
  });

  describe('storage adapter configuration', () => {
    describe('when legacy "s3" param', () => {
      describe('is provided', () => {
        const options = { s3: { some: 'data' }, baseUrl: 'dummy' };
        it('should create a storage.adapter configuration accordingly', () => {
          expect(sanitise(options).storage.options).to.deep.equal({
            some: 'data'
          });
          expect(sanitise(options).storage.adapter).to.equal(
            require('oc-s3-storage-adapter')
          );
        });
      });
    });
    describe('when no storage adapter', () => {
      describe('is provided', () => {
        const options = { storage: {}, baseUrl: 'dummy' };
        it('should default to the oc-s3-storage-adapter', () => {
          expect(sanitise(options).storage.adapter).to.equal(
            require('oc-s3-storage-adapter')
          );
        });
      });
    });

    describe('when refreshInterval', () => {
      describe('is provided', () => {
        const options = {
          refreshInterval: 666,
          storage: { options: {} },
          baseUrl: 'dummy'
        };
        it('should pass the refreshInterval to the storage options', () => {
          expect(sanitise(options).storage.options.refreshInterval).to.equal(
            666
          );
        });
      });
    });

    describe('when verbosity', () => {
      describe('is provided', () => {
        const options = {
          verbosity: true,
          storage: { options: {} },
          baseUrl: 'dummy'
        };
        it('should pass the verbosity to the storage options', () => {
          expect(sanitise(options).storage.options.verbosity).to.equal(true);
        });
      });
    });

    describe('when storage.path', () => {
      describe('does not include a protocol', () => {
        const options = {
          storage: { options: { path: '//someprovider.com' } },
          baseUrl: 'dummy'
        };
        it('should sanitize the path to rely on the https protocol', () => {
          expect(sanitise(options).storage.options.path).to.equal(
            'https://someprovider.com'
          );
        });
      });
      describe('does include a prefix', () => {
        const options = {
          storage: { path: 'http://someprovider.com' },
          baseUrl: 'dummy'
        };
        it('should not modify it', () => {
          expect(sanitise(options).storage.path).to.equal(
            'http://someprovider.com'
          );
        });
      });
    });
  });
});
