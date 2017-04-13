'use strict';

const utils = require('../../src/cli/domain/init-template/utils');
const expect = require('chai').expect;

describe('cli : domain : init-template utils', () => {

  describe('getPackageName utility', () => {
    const getPackageName = utils.getPackageName;

    it('should return the unaltered package name if alrady given', () => {
      expect(getPackageName('oc-template-jade')).to.equal('oc-template-jade');
      expect(getPackageName('are-we-there-yet-1.1.2.tgz')).to.equal('are-we-there-yet');
      expect(getPackageName('oc-template-jade@next')).to.equal('oc-template-jade');
    });
    it('should return the correct package name if inside a .tgz', () => {
      expect(getPackageName('are-we-there-yet-1.1.2.tgz')).to.equal('are-we-there-yet');
    });
    it('should return the correct package name if uses a @/ naming', () => {
      expect(getPackageName('oc-template-jade@1.1.1')).to.equal('oc-template-jade');
    });
  });
});
