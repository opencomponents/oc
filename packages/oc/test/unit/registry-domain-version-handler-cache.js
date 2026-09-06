const expect = require('chai').expect;
const semver = require('semver');
const semverExtra = require('semver-extra');
const sinon = require('sinon');

describe('registry : domain : version-handler resolution cache', () => {
  const versionHandler = require('../../dist/registry/domain/version-handler');
  const get = (requested, available) =>
    versionHandler.getAvailableVersion(requested, available);

  describe('range semantics preserved', () => {
    it('returns latest for unversioned requests, repeatedly', () => {
      const available = ['1.0.0', '1.0.1', '1.2.3', '2.0.0'];
      expect(get(undefined, available)).to.equal('2.0.0');
      expect(get(undefined, available)).to.equal('2.0.0');
      expect(get('', available)).to.equal('2.0.0');
    });

    it('returns exact versions', () => {
      const available = ['1.0.0', '1.0.1', '1.2.3', '2.0.0'];
      expect(get('1.0.1', available)).to.equal('1.0.1');
      expect(get('1.0.1', available)).to.equal('1.0.1');
    });

    it('resolves ranges', () => {
      const available = ['1.0.0', '1.0.1', '1.2.3', '2.0.0'];
      expect(get('1', available)).to.equal('1.2.3');
      expect(get('1', available)).to.equal('1.2.3');
      expect(get('~1.0.0', available)).to.equal('1.0.1');
      expect(get('^1.0.0', available)).to.equal('1.2.3');
      expect(get('1.X.X', available)).to.equal('1.2.3');
    });

    it('returns undefined for unsatisfiable requests, repeatedly', () => {
      const available = ['1.0.0', '1.0.1', '1.2.3', '2.0.0'];
      expect(get('9.9.9', available)).to.be.undefined;
      expect(get('9.9.9', available)).to.be.undefined;
      expect(get('hello!', available)).to.be.undefined;
      expect(get(undefined, [])).to.be.undefined;
    });

    it('keeps prerelease behaviour unchanged', () => {
      const onlyPrerelease = [
        '1.0.0-120',
        '1.0.1-121',
        '2.0.1-122',
        '2.0.1-123'
      ];
      expect(get(undefined, onlyPrerelease)).to.equal('2.0.1-123');
      expect(get(undefined, onlyPrerelease)).to.equal('2.0.1-123');
      expect(get('1.0.1-121', onlyPrerelease)).to.equal('1.0.1-121');

      const mixed = ['1.0.0', '1.0.1-121', '1.0.1', '2.0.1-122', '2.0.1-123'];
      expect(get(undefined, mixed)).to.equal('1.0.1');
      expect(get(undefined, mixed)).to.equal('1.0.1');
      expect(get('1.0.1-121', mixed)).to.equal('1.0.1-121');
    });
  });

  describe('memoization', () => {
    let maxSatisfying;
    let max;

    beforeEach(() => {
      maxSatisfying = sinon.stub(semver, 'maxSatisfying').callThrough();
      max = sinon.stub(semverExtra, 'max').callThrough();
    });

    afterEach(() => {
      sinon.restore();
    });

    it('resolves an unversioned request once per array', () => {
      const available = ['1.0.0', '1.0.1', '1.2.3', '2.0.0'];
      expect(get(undefined, available)).to.equal('2.0.0');
      expect(get(undefined, available)).to.equal('2.0.0');
      expect(get('', available)).to.equal('2.0.0');
      expect(maxSatisfying.callCount).to.equal(1);
    });

    it('resolves a ranged request once per (array, requested) pair', () => {
      const available = ['1.0.0', '1.0.1', '1.2.3', '2.0.0'];
      expect(get('1', available)).to.equal('1.2.3');
      expect(get('1', available)).to.equal('1.2.3');
      expect(get('~1.0.0', available)).to.equal('1.0.1');
      expect(get('~1.0.0', available)).to.equal('1.0.1');
      expect(maxSatisfying.callCount).to.equal(2);
    });

    it('caches misses so unsatisfiable requests resolve once', () => {
      const available = ['1.0.0', '1.0.1'];
      expect(get('9.9.9', available)).to.be.undefined;
      expect(get('9.9.9', available)).to.be.undefined;
      expect(maxSatisfying.callCount).to.equal(1);
    });

    it('re-resolves when the array reference changes', () => {
      const first = ['1.0.0', '1.0.1', '1.2.3', '2.0.0'];
      expect(get(undefined, first)).to.equal('2.0.0');
      expect(maxSatisfying.callCount).to.equal(1);

      const second = [...first];
      expect(get(undefined, second)).to.equal('2.0.0');
      expect(get(undefined, second)).to.equal('2.0.0');
      expect(maxSatisfying.callCount).to.equal(2);
    });

    it('caches exact-version hits without touching semver', () => {
      const available = ['1.0.0', '1.0.1', '1.2.3', '2.0.0'];
      expect(get('1.0.1', available)).to.equal('1.0.1');
      expect(get('1.0.1', available)).to.equal('1.0.1');
      expect(maxSatisfying.callCount).to.equal(0);
      expect(max.callCount).to.equal(0);
    });
  });

  describe('fail-open', () => {
    it('works on frozen arrays', () => {
      const available = Object.freeze(['1.0.0', '1.0.1', '2.0.0']);
      expect(get(undefined, available)).to.equal('2.0.0');
      expect(get(undefined, available)).to.equal('2.0.0');
      expect(get('1', available)).to.equal('1.0.1');
    });

    it('treats nullish requests as unversioned', () => {
      const available = ['1.0.0', '2.0.0'];
      expect(get(null, available)).to.equal('2.0.0');
      expect(get(undefined, available)).to.equal('2.0.0');
    });

    it('delegates exotic versions input to the real resolver', () => {
      expect(() => get('1.0.0', null)).to.throw();
      expect(() => get('1.0.0', undefined)).to.throw();
      // A throwing lookup must not poison later valid resolutions.
      const available = ['1.0.0', '2.0.0'];
      expect(get(undefined, available)).to.equal('2.0.0');
    });
  });
});
