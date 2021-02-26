'use strict';

const expect = require('chai').expect;

describe('utils : stripVersion', () => {
  const stripVersion = require('../../src/utils/strip-version');

  describe('when a non scoped dependency is provided', () => {
    const dependency = '/path/to/dependency@1.0.0';
    const name = stripVersion(dependency);

    it('should return the dependency without the version', () => {
      expect(name).to.equal('/path/to/dependency');
    });
  });

  describe('when a scoped dependency is provided', () => {
    const dependency = '/path/to/@the-scoped/package@1.2.3';
    const name = stripVersion(dependency);

    it('should return the dependency without the version', () => {
      expect(name).to.equal('/path/to/@the-scoped/package');
    });
  });
});
