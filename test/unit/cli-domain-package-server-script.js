'use strict';

const expect = require('chai').expect;

const externalDependenciesHandlers =
  require('../../src/cli/domain/package-server-script/bundle/config/externalDependenciesHandlers');
const webpackConfigGenerator =
  require('../../src/cli/domain/package-server-script/bundle/config');


describe('cli : domain : package-server-script ', () => {

  describe('bundle/config/externalDependenciesHandlers when configured with a dependencies hash', () => {
    const handler = externalDependenciesHandlers({lodash: '4.17.14'});

    it('should return an array containing a function and a regular expression ', () => {
      expect(handler).to.be.an('array');
      expect(handler.length).to.be.equal(2);
      expect(handler[1] instanceof RegExp).to.be.true;
      expect(handler[0]).to.be.a('function');
    });

    describe('its regular expression', () => {
      const regex = handler[1];
      it('should match npm module names', () => {
        expect(regex.test('lodash')).to.be.true;
        expect(regex.test('lodash/fp/curryN')).to.be.true;
        expect(regex.test('@cycle/xstream-run')).to.be.true;
      });
      it('should not match local modules', () => {
        expect(regex.test('/myModule')).to.be.false;
        expect(regex.test('./myModule')).to.be.false;
      });
    });

    describe('its function', () => {
      const missingDephandler = handler[0];
      it('should return an error if a specific npm-module is missing from the given dependencies', (done) => {
        missingDephandler('_', 'underscore', (err) => {
          expect(err.toString()).to.be.equal('Error: Missing dependencies from package.json => \"underscore\"');
          done();
        });
      });
      it('should invoke the callback with no arguments if module is not missing from the given dependencies', (done) => {
        missingDephandler('_', 'lodash', (err) => {
          expect(err).to.be.an('undefined');
          return done();
        });
      });
    });
  });

  describe('bundle/config', () => {

    describe('when configured', () => {
      const config = webpackConfigGenerator({
        webpack: { stats: 'none' },
        dependencies: {},
        fileName: 'server.js',
        dataPath: '/path/to/server.js'
      });

      it('should return a proper configuration options for webpack', () => {
        expect(config.entry).to.be.equal('/path/to/server.js');
        expect(config.output.filename).to.be.equal('server.js');
        expect(config.externals).to.be.an('array');
      });
    });
  });
});
