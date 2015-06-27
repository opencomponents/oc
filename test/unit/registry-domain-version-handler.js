'use strict';

var expect = require('chai').expect;

describe('registry : domain : version-handler', function(){

  var versionHandler = require(__BASE + '/registry/domain/version-handler');

  describe('when getting component', function(){

    var get = function(a,b){ return versionHandler.getAvailableVersion(a, b); };

    describe('when versions not available', function(){

      var availableVersions = [];

      it('should return an undefined when a version is specified', function(){
        var requestedVersion = '1.2.3';

        expect(get(requestedVersion, availableVersions)).to.be.undefined;
      });

      it('should return an undefined when a version is not specified', function(){
        expect(get(undefined, availableVersions)).to.be.undefined;
      });
    });

    describe('when versions available', function(){

      var availableVersions = ['1.0.0', '1.0.1', '1.2.3', '2.0.0'];

      it('should return the latest when a version is not specified', function(){
        expect(get(undefined, availableVersions)).to.equal('2.0.0');
      });

      it('should return undefined when not valid version specified', function(){
        expect(get('hello!', availableVersions)).to.be.undefined;
      });

      it('should return the latest when latest version specified', function(){
        expect(get('', availableVersions)).to.equal('2.0.0');
      });

      it('should return the latest minor+patch of a version when minor omitted', function(){
        expect(get('1', availableVersions)).to.equal('1.2.3');
      });

      it('should return the latest path for minor when patch omitted', function(){
        expect(get('1.0', availableVersions)).to.equal('1.0.1');
      });

      it('should return the latest patch of a version when ~ used on patch level', function(){
        expect(get('~1.0.0', availableVersions)).to.equal('1.0.1');
      });

      it('should return the latest patch version when ~ used on minor level', function(){
        expect(get('~1.0', availableVersions)).to.equal('1.0.1');
      });

      it('should return the latest patch of a version when X used on patch', function(){
        expect(get('1.2.X', availableVersions)).to.equal('1.2.3');
      });

      it('should return the latest patch of a version when X used on minor', function(){
        expect(get('1.X.X', availableVersions)).to.equal('1.2.3');
      });
    });
  });

  describe('when publishing component', function(){

    var existingVersions = ['1.0.0', '1.0.1', '1.0.3', '1.1.0', '2.0.0'],
        validate = function(a, b){ return versionHandler.validateNewVersion(a, b); };

    describe('when version already exists', function(){
      it('shouldn\'t be valid', function(){
        expect(validate('1.0.3', existingVersions)).to.be.false;
      });
    });

    describe('when version is available', function(){
      it('should be valid when major than latest', function(){
        expect(validate('2.0.1', existingVersions)).to.be.true;
      });

      it('should be valid when major than latest minor of previous major', function(){
        expect(validate('1.1.1', existingVersions)).to.be.true;
      });

      it('should be valid when major than latest patch of previous minor', function(){
        expect(validate('1.0.4', existingVersions)).to.be.true;
      });

      it('should be valid when minor than an existing patch but not existing', function(){
        expect(validate('1.0.2', existingVersions)).to.be.true;
      });
    });

  });
});