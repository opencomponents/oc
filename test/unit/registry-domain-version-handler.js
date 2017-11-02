'use strict';

const expect = require('chai').expect;

describe('registry : domain : version-handler', () => {
  const versionHandler = require('../../src/registry/domain/version-handler');

  describe('when getting component', () => {
    const get = function(a, b) {
      return versionHandler.getAvailableVersion(a, b);
    };

    describe('when versions not available', () => {
      const availableVersions = [];

      it('should return an undefined when a version is specified', () => {
        const requestedVersion = '1.2.3';

        expect(get(requestedVersion, availableVersions)).to.be.undefined;
      });

      it('should return an undefined when a version is not specified', () => {
        expect(get(undefined, availableVersions)).to.be.undefined;
      });
    });

    describe('when versions available', () => {
      const availableVersions = ['1.0.0', '1.0.1', '1.2.3', '2.0.0'];

      it('should return the latest when a version is not specified', () => {
        expect(get(undefined, availableVersions)).to.equal('2.0.0');
      });

      it('should return undefined when not valid version specified', () => {
        expect(get('hello!', availableVersions)).to.be.undefined;
      });

      it('should return the latest when latest version specified', () => {
        expect(get('', availableVersions)).to.equal('2.0.0');
      });

      it('should return the latest minor+patch of a version when minor omitted', () => {
        expect(get('1', availableVersions)).to.equal('1.2.3');
      });

      it('should return the latest path for minor when patch omitted', () => {
        expect(get('1.0', availableVersions)).to.equal('1.0.1');
      });

      it('should return the latest patch of a version when ~ used on patch level', () => {
        expect(get('~1.0.0', availableVersions)).to.equal('1.0.1');
      });

      it('should return the latest patch version when ~ used on minor level', () => {
        expect(get('~1.0', availableVersions)).to.equal('1.0.1');
      });

      it('should return the latest patch of a version when X used on patch', () => {
        expect(get('1.2.X', availableVersions)).to.equal('1.2.3');
      });

      it('should return the latest patch of a version when X used on minor', () => {
        expect(get('1.X.X', availableVersions)).to.equal('1.2.3');
      });
    });
    describe('when only pre release versions available', () => {
      const availableVersions = [
        '1.0.0-120',
        '1.0.1-121',
        '2.0.1-122',
        '2.0.1-123'
      ];

      it('should return the latest when a version is not specified', () => {
        expect(get(undefined, availableVersions)).to.equal('2.0.1-123');
      });

      it('should return undefined when not valid version specified', () => {
        expect(get('hello!', availableVersions)).to.be.undefined;
      });

      it('should return the latest when latest version specified', () => {
        expect(get('', availableVersions)).to.equal('2.0.1-123');
      });

      it('should return the version specified', () => {
        expect(get('1.0.1-121', availableVersions)).to.equal('1.0.1-121');
      });
    });
    describe('when mix of release and pre-release versions available', () => {
      const availableVersions = [
        '1.0.0',
        '1.0.1-121',
        '1.0.1',
        '2.0.1-122',
        '2.0.1-123'
      ];

      it('should return the latest release version when a version is not specified', () => {
        expect(get(undefined, availableVersions)).to.equal('1.0.1');
      });

      it('should return the latest when latest version specified', () => {
        expect(get('', availableVersions)).to.equal('1.0.1');
      });

      it('should return the version specified', () => {
        expect(get('1.0.1-121', availableVersions)).to.equal('1.0.1-121');
      });
    });
  });

  describe('when publishing component', () => {
    const existingVersions = ['1.0.0', '1.0.1', '1.0.3', '1.1.0', '2.0.0'],
      validate = function(a, b) {
        return versionHandler.validateNewVersion(a, b);
      };

    describe('when version already exists', () => {
      it("shouldn't be valid", () => {
        expect(validate('1.0.3', existingVersions)).to.be.false;
      });
    });

    describe('when version is available', () => {
      it('should be valid when major than latest', () => {
        expect(validate('2.0.1', existingVersions)).to.be.true;
      });

      it('should be valid when major than latest minor of previous major', () => {
        expect(validate('1.1.1', existingVersions)).to.be.true;
      });

      it('should be valid when major than latest patch of previous minor', () => {
        expect(validate('1.0.4', existingVersions)).to.be.true;
      });

      it('should be valid when minor than an existing patch but not existing', () => {
        expect(validate('1.0.2', existingVersions)).to.be.true;
      });
    });
  });
});
