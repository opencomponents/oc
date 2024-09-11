const expect = require('chai').expect;
const injectr = require('injectr');
const sinon = require('sinon');

describe('cli : domain : clean', () => {
  const initialize = (options) => {
    options = options || {};
    return injectr('../../dist/cli/domain/clean.js', {
      './get-components-by-dir': () => () =>
        options.getComponentsByDirError
          ? Promise.reject(options.getComponentsByDirError)
          : Promise.resolve(['path/to/my-component1', 'path/to/my-component2']),
      'node:fs': {
        existsSync: (dir) => dir.indexOf('my-component1') >= 0
      },
      'node:fs/promises': {
        rmdir: options.rmdirMock
      },
      'node:path': { join: (...params) => params.join('/') }
    });
  };

  describe('when fetching the list of folders to clean', () => {
    describe('happy path', () => {
      let error;
      let result;
      beforeEach((done) => {
        const clean = initialize();
        clean
          .fetchList('my-components-folder')
          .then((res) => {
            result = res;
          })
          .catch((err) => {
            error = err;
          })
          .finally(done);
      });

      it('should return no error', () => expect(error).to.be.undefined);

      it('should return the list', () =>
        expect(result).to.eql(['path/to/my-component1/node_modules']));
    });

    describe('getComponentsByDir error', () => {
      let error;
      beforeEach((done) => {
        const clean = initialize({
          getComponentsByDirError: new Error('oops')
        });

        clean
          .fetchList('my-components-folder')
          .catch((err) => {
            error = err;
          })
          .finally(done);
      });

      it('should return error', () =>
        expect(error.toString()).to.equal('Error: oops'));
    });
  });

  describe('when removing the folders to clean', () => {
    describe('happy path', () => {
      let error;
      let rmdirMock;
      beforeEach((done) => {
        rmdirMock = sinon.stub().resolves('ok');
        const clean = initialize({ rmdirMock });

        clean
          .remove(['path/to/my-component1/node_modules'])
          .catch((err) => {
            error = err;
          })
          .finally(done);
      });

      it('should return no error', () => expect(error).to.be.undefined);

      it('should remove all the folders', () => {
        expect(rmdirMock.args.length).to.equal(1);
        expect(rmdirMock.args[0][0]).to.eql(
          'path/to/my-component1/node_modules'
        );
      });
    });

    describe('fs.rmdir error', () => {
      let error;
      let rmdirMock;
      beforeEach((done) => {
        rmdirMock = sinon.stub().rejects(new Error('nope'));
        const clean = initialize({ rmdirMock });

        clean
          .remove(['path/to/my-component1/node_modules'])
          .catch((err) => {
            error = err;
          })
          .finally(done);
      });

      it('should return the error', () =>
        expect(error.toString()).to.be.equal('Error: nope'));

      it('should try removing all the folders', () => {
        expect(rmdirMock.args.length).to.equal(1);
        expect(rmdirMock.args[0][0]).to.eql(
          'path/to/my-component1/node_modules'
        );
      });
    });
  });
});
