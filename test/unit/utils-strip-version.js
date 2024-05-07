const expect = require('chai').expect;
const path = require('node:path');

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

    describe('when an aliased version is included', () => {
      const name = stripVersion(
        dependency + '@npm:dummy/another_package@1.2.3'
      );

      it('should return the aliased dependency', () => {
        expect(name).to.equal(path.join('dummy/another_package'));
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

    describe('when an aliased version is included', () => {
      const name = stripVersion(
        dependency + '@npm:@the-scoped/another_package@1.2.3'
      );

      it('should return the aliased dependency', () => {
        expect(name).to.equal(path.join('@the-scoped/another_package'));
      });
    });
  });
});
