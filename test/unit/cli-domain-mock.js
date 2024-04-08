const expect = require('chai').expect;
const injectr = require('injectr');
const path = require('node:path');
const sinon = require('sinon');

const initialise = () => {
  const fsMock = {
    existsSync: sinon.stub(),
    readJson: sinon.stub(),
    writeJson: sinon.stub().resolves('ok')
  };

  const pathMock = {
    extname: path.extname,
    join: path.join,
    resolve: (...args) => args.join('/')
  };

  const Local = injectr(
    '../../dist/cli/domain/mock.js',
    {
      'fs-extra': fsMock,
      path: pathMock
    },
    { __dirname: '' }
  ).default;

  const local = Local();

  return { local: local, fs: fsMock };
};

const executeMocking = (local, type, name, value, cb) =>
  local({
    targetType: type,
    targetName: name,
    targetValue: value
  })
    .catch(() => {})
    .finally(cb);

describe('cli : domain : mock', () => {
  describe('when mocking a static plugin', () => {
    let data;
    beforeEach((done) => {
      data = initialise();

      data.fs.readJson.resolves({ something: 'hello' });
      data.fs.writeJson.resolves('ok');

      executeMocking(data.local, 'plugin', 'getValue', 'value', done);
    });

    it('should add mock to oc.json', () => {
      expect(data.fs.writeJson.called).to.be.true;
      expect(data.fs.writeJson.args[0][1]).to.eql({
        something: 'hello',
        mocks: {
          plugins: {
            static: {
              getValue: 'value'
            }
          }
        }
      });
    });
  });

  describe('when mocking a static plugin using a bool value', () => {
    let data;
    beforeEach((done) => {
      data = initialise();

      data.fs.readJson.resolves({ something: 'hello' });
      data.fs.writeJson.resolves('ok');

      executeMocking(data.local, 'plugin', 'isTrue', false, done);
    });

    it('should add mock to oc.json', () => {
      expect(data.fs.writeJson.called).to.be.true;
      expect(data.fs.writeJson.args[0][1]).to.eql({
        something: 'hello',
        mocks: {
          plugins: {
            static: {
              isTrue: false
            }
          }
        }
      });
    });
  });

  describe('when mocking a dynamic plugin', () => {
    let data;
    beforeEach((done) => {
      data = initialise();

      data.fs.readJson.resolves({ something: 'hello' });
      data.fs.existsSync.returns(true);
      data.fs.writeJson.resolves('ok');

      executeMocking(data.local, 'plugin', 'getValue', './value.js', done);
    });

    it('should add mock to oc.json', () => {
      expect(data.fs.writeJson.called).to.be.true;
      expect(data.fs.writeJson.args[0][1]).to.eql({
        something: 'hello',
        mocks: {
          plugins: {
            dynamic: {
              getValue: './value.js'
            }
          }
        }
      });
    });
  });
});
