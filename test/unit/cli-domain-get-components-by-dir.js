const expect = require('chai').expect;
const injectr = require('injectr');
const path = require('node:path');
const sinon = require('sinon');

const initialise = () => {
  const fsMock = {
    readdir: sinon.stub(),
    readFileSync: sinon.stub()
  };

  const pathMock = {
    extname: path.extname,
    join: path.join,
    resolve: (...args) => args.join('/')
  };

  const GetComponentsByDir = injectr(
    '../../dist/cli/domain/get-components-by-dir.js',
    {
      'node:fs': fsMock,
      'node:fs/promises': fsMock,
      'node:path': pathMock
    },
    { __dirname: '' }
  );

  const local = GetComponentsByDir.default();

  return { local: local, fs: fsMock };
};

const executeComponentsListingByDir = (local, componentsToRun) =>
  local('.', componentsToRun);

describe('cli : domain : get-components-by-dir', () => {
  describe('when getting components from dir', () => {
    let error;
    let result;
    beforeEach((done) => {
      const data = initialise();

      data.fs.readdir
        .onCall(0)
        .resolves([
          'a-component',
          'a-not-component-dir',
          'a-file.json',
          '_package',
          'no-component-but-package-json'
        ]);

      data.fs.readFileSync.onCall(0).returns(JSON.stringify({ oc: {} }));
      data.fs.readFileSync
        .onCall(1)
        .throws(new Error('ENOENT: no such file or directory'));
      data.fs.readFileSync
        .onCall(2)
        .throws(new Error('ENOENT: no such file or directory'));
      data.fs.readFileSync
        .onCall(3)
        .returns(JSON.stringify({ oc: { packaged: true } }));
      data.fs.readFileSync.onCall(4).returns('{}');

      executeComponentsListingByDir(data.local)
        .then((res) => {
          result = res;
        })
        .catch((err) => {
          error = err;
        })
        .finally(done);
    });

    it('should not error', () => {
      expect(error).to.be.undefined;
    });

    it('should get the correct list', () => {
      expect(result).to.eql(['./a-component']);
    });
  });

  describe('when reading a broken package.json', () => {
    let error;
    let result;
    beforeEach((done) => {
      const data = initialise();

      data.fs.readdir
        .onCall(0)
        .resolves(['a-broken-component', 'another-component']);

      data.fs.readFileSync.onCall(0).throws(new Error('syntax error: fubar'));
      data.fs.readFileSync.onCall(1).returns(JSON.stringify({ oc: {} }));

      executeComponentsListingByDir(data.local)
        .then((res) => {
          result = res;
        })
        .catch((err) => {
          error = err;
        })
        .finally(done);
    });

    it('should not error', () => {
      expect(error).to.be.undefined;
    });

    it('should get the correct list', () => {
      expect(result).to.eql(['./another-component']);
    });
  });

  describe('when finds no components', () => {
    let error;
    let result;
    beforeEach((done) => {
      const data = initialise();

      data.fs.readdir
        .onCall(0)
        .resolves(['a-broken-component', 'not-a-component-dir', 'file.json']);

      data.fs.readFileSync.onCall(0).throws(new Error('syntax error: fubar'));
      data.fs.readFileSync
        .onCall(1)
        .throws(new Error('ENOENT: no such file or directory'));
      data.fs.readFileSync
        .onCall(2)
        .throws(new Error('ENOENT: no such file or directory'));

      executeComponentsListingByDir(data.local)
        .then((res) => {
          result = res;
        })
        .catch((err) => {
          error = err;
        })
        .finally(done);
    });

    it('should not error', () => {
      expect(error).to.be.undefined;
    });

    it('should get an empty list', () => {
      expect(result).to.eql([]);
    });
  });

  describe('when components are filtered', () => {
    let error;
    let result;
    beforeEach((done) => {
      const data = initialise();

      data.fs.readdir
        .onCall(0)
        .resolves([
          'component1',
          'component2',
          'component3',
          'component4',
          'package.json'
        ]);

      data.fs.readFileSync.onCall(0).returns(JSON.stringify({ oc: {} }));
      data.fs.readFileSync.onCall(1).returns(JSON.stringify({ oc: {} }));
      data.fs.readFileSync.onCall(2).returns(JSON.stringify({ oc: {} }));
      data.fs.readFileSync.onCall(3).returns(JSON.stringify({ oc: {} }));
      data.fs.readFileSync
        .onCall(4)
        .throws(new Error('ENOENT: no such file or directory'));

      executeComponentsListingByDir(data.local, ['component1', 'component3'])
        .then((res) => {
          result = res;
        })
        .catch((err) => {
          error = err;
        })
        .finally(done);
    });

    it('should not error', () => {
      expect(error).to.be.undefined;
    });

    it('should get an the filtered list', () => {
      expect(result).to.eql(['./component1', './component3']);
    });
  });
});
