'use strict';

const expect = require('chai').expect;
const injectr = require('injectr');
const sinon = require('sinon');

describe('cli : facade : clean', () => {
  const logSpy = {};

  let error, result, readMock;
  const execute = (options, done) => {
    logSpy.ok = sinon.spy();
    logSpy.err = sinon.spy();
    logSpy.warn = sinon.spy();

    readMock = sinon.mock().yields(null, options.prompt || 'yes');

    const local = {
      clean: {
        fetchList: options.mocks.fetchList,
        remove: options.mocks.remove
      }
    };

    const CleanFacade = injectr('../../src/cli/facade/clean.js', {
      read: readMock
    });

    const cleanFacade = new CleanFacade({ local, logger: logSpy });
    cleanFacade(options.params, (err, res) => {
      error = err;
      result = res;
      done();
    });
  };

  describe('when cleaning folder', () => {
    describe('when folder is already clean', () => {
      let removeMock;
      beforeEach(done => {
        removeMock = sinon.mock();
        const options = {
          mocks: { fetchList: (dir, cb) => cb(null, []), remove: removeMock },
          params: { dirPath: 'path/to/components' }
        };
        execute(options, done);
      });

      it('should show a message', () =>
        expect(logSpy.ok.args[0][0]).to.equal('The folders are already clean'));

      it(`shouldn't call local.remove`, () => {
        expect(removeMock.args.length).to.equal(0);
      });
    });

    describe('when folder needs cleaning and --yes flag passed down', () => {
      let removeMock;
      beforeEach(done => {
        removeMock = sinon.mock().yields(null, 'ok');
        const options = {
          mocks: {
            fetchList: (dir, cb) => cb(null, ['/folder/to/remove']),
            remove: removeMock
          },
          params: { dirPath: 'path/to/components', yes: true }
        };
        execute(options, done);
      });

      it('should show a message before removing', () =>
        expect(logSpy.warn.args[0][0]).to.equal(
          'The following folders will be removed:\n/folder/to/remove'
        ));

      it(`should remove the folder`, () =>
        expect(removeMock.args[0][0]).to.eql(['/folder/to/remove']));

      it('should show a message when done', () =>
        expect(logSpy.ok.args[0][0]).to.equal('Folders removed'));
    });

    describe('when folder needs cleaning and no --yes flag passed down and users says yes', () => {
      let removeMock;
      beforeEach(done => {
        removeMock = sinon.mock().yields(null, 'ok');
        const options = {
          mocks: {
            fetchList: (dir, cb) => cb(null, ['/folder/to/remove']),
            remove: removeMock
          },
          params: { dirPath: 'path/to/components' }
        };
        execute(options, done);
      });

      it('should show a message before removing', () =>
        expect(logSpy.warn.args[0][0]).to.equal(
          'The following folders will be removed:\n/folder/to/remove'
        ));

      it('should prompt the user to confirm', () =>
        expect(readMock.args[0][0]).to.eql({
          default: 'Y',
          prompt: 'Proceed? [Y/n]'
        }));

      it(`should then remove the folder`, () =>
        expect(removeMock.args[0][0]).to.eql(['/folder/to/remove']));

      it('should show a message when done', () =>
        expect(logSpy.ok.args[0][0]).to.equal('Folders removed'));
    });

    describe('when folder needs cleaning and no --yes flag passed down and users says no', () => {
      let removeMock;
      beforeEach(done => {
        removeMock = sinon.mock().yields(null, 'ok');
        const options = {
          mocks: {
            fetchList: (dir, cb) => cb(null, ['/folder/to/remove']),
            remove: removeMock
          },
          params: { dirPath: 'path/to/components' },
          prompt: 'no'
        };
        execute(options, done);
      });

      it('should show a message before removing', () =>
        expect(logSpy.warn.args[0][0]).to.equal(
          'The following folders will be removed:\n/folder/to/remove'
        ));

      it('should prompt the user to confirm', () =>
        expect(readMock.args[0][0]).to.eql({
          default: 'Y',
          prompt: 'Proceed? [Y/n]'
        }));

      it(`shouldn't remove the folder`, () =>
        expect(removeMock.args.length).to.equal(0));
    });

    describe('when removing causes an error', () => {
      let removeMock;
      beforeEach(done => {
        removeMock = sinon.mock().yields(new Error('permission error'));
        const options = {
          mocks: {
            fetchList: (dir, cb) => cb(null, ['/folder/to/remove']),
            remove: removeMock
          },
          params: { dirPath: 'path/to/components', yes: true }
        };
        execute(options, done);
      });

      it('should show a message before removing', () =>
        expect(logSpy.warn.args[0][0]).to.equal(
          'The following folders will be removed:\n/folder/to/remove'
        ));

      it(`should try removing the folder`, () =>
        expect(removeMock.args[0][0]).to.eql(['/folder/to/remove']));

      it('should show an error message at the end', () =>
        expect(logSpy.err.args[0][0]).to.equal(
          'An error happened when removing the folders: Error: permission error'
        ));
    });
  });
});
