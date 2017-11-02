'use strict';

const expect = require('chai').expect;
const path = require('path');
const request = require('minimal-request');

describe('registry', () => {
  describe('when fallbackRegistryUrl is specified', () => {
    const oc = require('../../../src/index');
    let fallbackRegistry;
    let registry;
    let result;

    function retrieveRegistryConfiguration(
      port,
      pathToComponents,
      fallbackRegistryUrl
    ) {
      return {
        local: true,
        path: path.resolve(pathToComponents),
        port: port,
        fallbackRegistryUrl: fallbackRegistryUrl,
        baseUrl: 'http://localhost:' + port + '/',
        env: { name: 'local' },
        verbosity: 0,
        dependencies: ['lodash']
      };
    }

    function next(done) {
      return function(e, r) {
        result = r;
        done();
      };
    }

    before(done => {
      registry = new oc.Registry(
        retrieveRegistryConfiguration(
          3030,
          'test/fixtures/components',
          'http://localhost:3031'
        )
      );
      fallbackRegistry = new oc.Registry(
        retrieveRegistryConfiguration(
          3031,
          'test/fixtures/fallback-registry-components'
        )
      );
      registry.start(() => {
        fallbackRegistry.start(done);
      });
    });

    after(done => {
      registry.close(() => {
        fallbackRegistry.close(done);
      });
    });

    describe('GET /welcome', () => {
      before(done => {
        request(
          {
            url: 'http://localhost:3030/welcome',
            json: true
          },
          next(done)
        );
      });

      it('should respond with the local registry url', () => {
        expect(result.href).to.eql('http://localhost:3030/welcome');
      });

      it('should respond the `Hello world!` html', () => {
        expect(result.html).to.equal('<span>hi John Doe  </span>');
      });
    });

    describe('GET /fallback-hello-world', () => {
      before(done => {
        request(
          {
            url: 'http://localhost:3030/fallback-hello-world',
            json: true
          },
          next(done)
        );
      });

      it('should respond with the fallback registry url', () => {
        expect(result.href).to.eql(
          'http://localhost:3031/fallback-hello-world'
        );
      });

      it('should respond the `Hello world!` html', () => {
        expect(result.html).to.equal('Hello world!');
      });
    });

    describe('GET /fallback-hello-world/~info', () => {
      before(done => {
        request(
          {
            url:
              'http://localhost:3030/fallback-welcome-with-optional-parameters/~info',
            json: true
          },
          next(done)
        );
      });

      it('should respond with requested component', () => {
        expect(result.name).to.eql('fallback-welcome-with-optional-parameters');
      });

      it('should respond with components parameters', () => {
        expect(Object.keys(result.oc.parameters).length).to.equal(3);
      });
    });

    describe('GET /fallback-hello-world/~preview', () => {
      before(done => {
        request(
          {
            url:
              'http://localhost:3030/fallback-welcome-with-optional-parameters/~preview',
            json: true
          },
          next(done)
        );
      });

      it('should respond with requested component', () => {
        expect(result.name).to.eql('fallback-welcome-with-optional-parameters');
      });

      it('should respond with components parameters', () => {
        expect(Object.keys(result.oc.parameters).length).to.equal(3);
      });
    });
  });
});
