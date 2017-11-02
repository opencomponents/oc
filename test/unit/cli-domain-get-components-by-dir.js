'use strict';

const expect = require('chai').expect;
const injectr = require('injectr');
const path = require('path');
const sinon = require('sinon');
const _ = require('lodash');

const initialise = function() {
  const fsMock = {
    readdirSync: sinon.stub(),
    readJsonSync: sinon.stub()
  };

  const pathMock = {
    extname: path.extname,
    join: path.join,
    resolve: function() {
      return _.toArray(arguments).join('/');
    }
  };

  const GetComponentsByDir = injectr(
    '../../src/cli/domain/get-components-by-dir.js',
    {
      'fs-extra': fsMock,
      path: pathMock
    },
    { __dirname: '' }
  );

  const local = new GetComponentsByDir();

  return { local: local, fs: fsMock };
};

const executeComponentsListingByDir = function(local, callback) {
  return local('.', callback);
};

describe('cli : domain : get-components-by-dir', () => {
  describe('when getting components from dir', () => {
    let error, result;
    beforeEach(done => {
      const data = initialise();

      data.fs.readdirSync
        .onCall(0)
        .returns([
          'a-component',
          'a-not-component-dir',
          'a-file.json',
          '_package',
          'no-component-but-package-json'
        ]);

      data.fs.readJsonSync.onCall(0).returns({ oc: {} });
      data.fs.readJsonSync
        .onCall(1)
        .throws(new Error('ENOENT: no such file or directory'));
      data.fs.readJsonSync
        .onCall(2)
        .throws(new Error('ENOENT: no such file or directory'));
      data.fs.readJsonSync.onCall(3).returns({ oc: { packaged: true } });
      data.fs.readJsonSync.onCall(4).returns({});

      executeComponentsListingByDir(data.local, (err, res) => {
        error = err;
        result = res;
        done();
      });
    });

    it('should not error', () => {
      expect(error).to.be.null;
    });

    it('should get the correct list', () => {
      expect(result).to.eql(['./a-component']);
    });
  });

  describe('when reading a broken package.json', () => {
    let error, result;
    beforeEach(done => {
      const data = initialise();

      data.fs.readdirSync
        .onCall(0)
        .returns(['a-broken-component', 'another-component']);

      data.fs.readJsonSync.onCall(0).throws(new Error('syntax error: fubar'));
      data.fs.readJsonSync.onCall(1).returns({ oc: {} });

      executeComponentsListingByDir(data.local, (err, res) => {
        error = err;
        result = res;
        done();
      });
    });

    it('should not error', () => {
      expect(error).to.be.null;
    });

    it('should get the correct list', () => {
      expect(result).to.eql(['./another-component']);
    });
  });

  describe('when finds no components', () => {
    let error, result;
    beforeEach(done => {
      const data = initialise();

      data.fs.readdirSync
        .onCall(0)
        .returns(['a-broken-component', 'not-a-component-dir', 'file.json']);

      data.fs.readJsonSync.onCall(0).throws(new Error('syntax error: fubar'));
      data.fs.readJsonSync
        .onCall(1)
        .throws(new Error('ENOENT: no such file or directory'));
      data.fs.readJsonSync
        .onCall(2)
        .throws(new Error('ENOENT: no such file or directory'));

      executeComponentsListingByDir(data.local, (err, res) => {
        error = err;
        result = res;
        done();
      });
    });

    it('should not error', () => {
      expect(error).to.be.null;
    });

    it('should get an empty list', () => {
      expect(result).to.eql([]);
    });
  });
});
