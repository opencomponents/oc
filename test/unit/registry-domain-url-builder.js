'use strict';

const expect = require('chai').expect;

describe('registry : domain : url-builder', () => {
  const urlBuilder = require('../../src/registry/domain/url-builder');

  let builtUrl;

  describe('when building component url', () => {
    const execute = function(component, baseUrl) {
      builtUrl = urlBuilder.component(component, baseUrl);
    };

    describe('when building component with just component name', () => {
      before(() => {
        execute('component-name', 'http://www.registry.com/api/v2/');
      });

      it('should be baseUrl/componentName', () => {
        expect(builtUrl).to.equal(
          'http://www.registry.com/api/v2/component-name'
        );
      });
    });

    describe('when building component with version', () => {
      before(() => {
        execute(
          {
            name: 'component',
            version: '~1.2.3'
          },
          'http://registry.com'
        );
      });

      it('should be baseUrl/componentName/version', () => {
        expect(builtUrl).to.equal('http://registry.com/component/~1.2.3');
      });
    });

    describe('when building component with query string parameters', () => {
      const component = {
        name: 'hello-world',
        version: '1.X.X'
      };

      describe('when building component with number parameter', () => {
        before(() => {
          component.parameters = { age: 23 };
          execute(component, 'http://oc-registry.net');
        });

        it('should be baseUrl/componentName/version/?param=123', () => {
          expect(builtUrl).to.equal(
            'http://oc-registry.net/hello-world/1.X.X?age=23'
          );
        });
      });

      describe('when building component with url parameter', () => {
        before(() => {
          component.parameters = {
            returnUrl: 'http://www.website.com/?q=blabla&q2=hello'
          };
          execute(component, 'http://oc-registry.org');
        });

        it('should be baseUrl/componentName/version/?param=encodedUrl', () => {
          expect(builtUrl).to.equal(
            'http://oc-registry.org/hello-world/1.X.X?returnUrl=http%3A%2F%2Fwww.website.com%2F%3Fq%3Dblabla%26q2%3Dhello'
          );
        });
      });
    });
  });

  describe('when building component preview url', () => {
    const execute = function(component, baseUrl) {
      builtUrl = urlBuilder.componentPreview(component, baseUrl);
    };

    describe('when building url with just component name', () => {
      before(() => {
        execute('component-name', 'http://www.registry.com/api/v2/');
      });

      it('should be baseUrl/componentName', () => {
        expect(builtUrl).to.equal(
          'http://www.registry.com/api/v2/component-name/~preview/'
        );
      });
    });

    describe('when building url with version', () => {
      before(() => {
        execute(
          {
            name: 'component',
            version: '~1.2.3'
          },
          'http://registry.com'
        );
      });

      it('should be baseUrl/componentName/version', () => {
        expect(builtUrl).to.equal(
          'http://registry.com/component/~1.2.3/~preview/'
        );
      });
    });

    describe('when building url with query string parameters', () => {
      const component = {
        name: 'hello-world',
        version: '1.X.X'
      };

      describe('when building component with number parameter', () => {
        before(() => {
          component.parameters = { age: 23 };
          execute(component, 'http://oc-registry.net');
        });

        it('should be baseUrl/componentName/version/?param=123', () => {
          expect(builtUrl).to.equal(
            'http://oc-registry.net/hello-world/1.X.X/~preview/?age=23'
          );
        });
      });

      describe('when building component with url parameter', () => {
        before(() => {
          component.parameters = {
            returnUrl: 'http://www.website.com/?q=blabla&q2=hello'
          };
          execute(component, 'http://oc-registry.org');
        });

        it('should be baseUrl/componentName/version/?param=encodedUrl', () => {
          expect(builtUrl).to.equal(
            'http://oc-registry.org/hello-world/1.X.X/~preview/?returnUrl=http%3A%2F%2Fwww.website.com%2F%3Fq%3Dblabla%26q2%3Dhello'
          );
        });
      });
    });
  });
});
