'use strict';

const expect = require('chai').expect;
const path = require('path');

describe('utils : stripVersion', () => {
  const stripVersion = require('../../dist/utils/strip-version').default;

  describe('when a non scoped dependency is provided', () => {
    const dependency = '/path/to/dependency';

    describe('when a version is included', () => {
      const name = stripVersion(dependency + '@1.0.0');

      it('should return the dependency without the version', () => {
        expect(name).to.equal(path.join('/path/to/dependency'));
      });
    });

    describe('when a version is not included', () => {
      const name = stripVersion(dependency);

      it('should return the unmodified dependency', () => {
        expect(name).to.equal(path.join('/path/to/dependency'));
      });
    });
  });

  describe('when a scoped dependency is provided', () => {
    const dependency = '/path/to/@the-scoped/package';

    describe('when a version is included', () => {
      const name = stripVersion(dependency + '@1.2.3');

      it('should return the dependency without the version', () => {
        expect(name).to.equal(path.join('/path/to/@the-scoped/package'));
      });
    });

    describe('when a version is not included', () => {
      const name = stripVersion(dependency);

      it('should return the unmodified dependency', () => {
        expect(name).to.equal(path.join('/path/to/@the-scoped/package'));
      });
    });
  });
});
