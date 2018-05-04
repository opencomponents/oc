'use strict';

const expect = require('chai').expect;
const injectr = require('injectr');
const sinon = require('sinon');

describe('cli : domain : clean', () => {
  const initialize = options => {
    options = options || {};
    return injectr('../../src/cli/domain/clean.js', {
      './get-components-by-dir': () => (dir, cb) =>
        cb(options.getComponentsByDirError, [
          'path/to/my-component1',
          'path/to/my-component2'
        ]),
      'fs-extra': {
        exists: (dir, cb) => cb(dir.indexOf('my-component1') >= 0),
        remove: options.removeMock
      },
      path: { join: (...params) => params.join('/') }
    });
  };

  describe('when fetching the list of folders to clean', () => {
    describe('happy path', () => {
      let error, result;
      beforeEach(done => {
        const clean = initialize();
        clean.fetchList('my-components-folder', (err, res) => {
          error = err;
          result = res;
          done();
        });
      });

      it('should return no error', () => expect(error).to.be.null);

      it('should return the list', () =>
        expect(result).to.eql(['path/to/my-component1/node_modules']));
    });

    describe('getComponentsByDir error', () => {
      let error, result;
      beforeEach(done => {
        const clean = initialize({
          getComponentsByDirError: new Error('oops')
        });

        clean.fetchList('my-components-folder', (err, res) => {
          error = err;
          result = res;
          done();
        });
      });

      it('should return error', () =>
        expect(error.toString()).to.equal('Error: oops'));
    });
  });

  describe('when removing the folders to clean', () => {
    describe('happy path', () => {
      let error, result, removeMock;
      beforeEach(done => {
        removeMock = sinon.stub().yields(null, 'ok');
        const clean = initialize({ removeMock });
        clean.remove(['path/to/my-component1/node_modules'], (err, res) => {
          error = err;
          result = res;
          done();
        });
      });

      it('should return no error', () => expect(error).to.be.null);

      it('should remove all the folders', () => {
        expect(removeMock.args.length).to.equal(1);
        expect(removeMock.args[0][0]).to.eql(
          'path/to/my-component1/node_modules'
        );
      });
    });

    describe('fs.remove error', () => {
      let error, result, removeMock;
      beforeEach(done => {
        removeMock = sinon.stub().yields(new Error('nope'));
        const clean = initialize({ removeMock });
        clean.remove(['path/to/my-component1/node_modules'], (err, res) => {
          error = err;
          result = res;
          done();
        });
      });

      it('should return the error', () =>
        expect(error.toString()).to.be.equal('Error: nope'));

      it('should try removing all the folders', () => {
        expect(removeMock.args.length).to.equal(1);
        expect(removeMock.args[0][0]).to.eql(
          'path/to/my-component1/node_modules'
        );
      });
    });
  });
});
