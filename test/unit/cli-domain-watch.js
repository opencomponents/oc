'use strict';

const expect = require('chai').expect;
const injectr = require('injectr');
const sinon = require('sinon');

describe('cli : domain : watch', () => {
  const execute = (fileChanged, separator, cb) => {
    class Stats {
      constructor(settings) {
        this.stuff = settings.stuff;
      }
    }

    const watch = injectr('../../src/cli/domain/watch.js', {
      path: {
        resolve: x => x,
        sep: separator
      },
      watch: {
        watchTree: sinon
          .stub()
          .yields(
            fileChanged,
            new Stats('some stuff about current state'),
            new Stats('previous stuff about the previous state')
          )
      }
    });

    watch(
      [
        'C:\\Windows-like\\path\\to\\yet-another-component',
        '/path/to/my-component',
        '/path/to/my-component2',
        '/path/to/some-other-component'
      ],
      '/path/to/',
      cb
    );
  };

  describe('when a file from a component changes', () => {
    let result;
    before(done => {
      execute(
        '/path/to/my-component/server.js',
        '/',
        (error, fileName, componentDir) => {
          result = { error, fileName, componentDir };
          done();
        }
      );
    });

    it('should return no error', () => {
      expect(result.error).to.be.null;
    });

    it('should return the fileName', () => {
      expect(result.fileName).to.equal('/path/to/my-component/server.js');
    });

    it('should return the component folder', () => {
      expect(result.componentDir).to.equal('/path/to/my-component');
    });
  });

  describe('when a file from a component whose name matches another component changes', () => {
    let result;
    before(done => {
      execute(
        '/path/to/my-component2/server.js',
        '/',
        (error, fileName, componentDir) => {
          result = { error, fileName, componentDir };
          done();
        }
      );
    });

    it('should return no error', () => {
      expect(result.error).to.be.null;
    });

    it('should return the fileName', () => {
      expect(result.fileName).to.equal('/path/to/my-component2/server.js');
    });

    it('should return the component folder', () => {
      expect(result.componentDir).to.equal('/path/to/my-component2');
    });
  });

  describe('when a file from a component on Windows-like path changes', () => {
    let result;
    before(done => {
      execute(
        'C:\\Windows-like\\path\\to\\yet-another-component\\server.js',
        '\\',
        (error, fileName, componentDir) => {
          result = { error, fileName, componentDir };
          done();
        }
      );
    });

    it('should return no error', () => {
      expect(result.error).to.be.null;
    });

    it('should return the fileName', () => {
      expect(result.fileName).to.equal(
        'C:\\Windows-like\\path\\to\\yet-another-component\\server.js'
      );
    });

    it('should return the component folder', () => {
      expect(result.componentDir).to.equal(
        'C:\\Windows-like\\path\\to\\yet-another-component'
      );
    });
  });
});
