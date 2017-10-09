'use strict';

const expect = require('chai').expect;

describe('resources : settings', () => {
  const settings = require('../../src/resources/settings');

  describe('files to watch ignore regex', () => {
    const execute = fileName => {
      const regex = settings.filesToIgnoreOnDevWatch;
      return regex.test(fileName) === true;
    };

    describe('when a legitimate file changes', () => {
      it('should not ignore it', () => {
        const result = execute('/path/to/component/server.js');
        expect(result).to.be.false;
      });
    });

    describe('when a file in a github.io repo changes', () => {
      it('should not ignore it', () => {
        const result = execute(
          '/path/to/opencomponents.github.io/components/landing-page/server.js'
        );
        expect(result).to.be.false;
      });
    });

    describe('when something in the .git folder changes', () => {
      it('should ignore it', () => {
        const result = execute('/path/to/.git/HEAD');
        expect(result).to.be.true;
      });
    });

    describe('when node_modules changes', () => {
      it('should ignore it', () => {
        const result = execute('/path/to/node_modules/something-changed');
        expect(result).to.be.true;
      });
    });
  });
});
