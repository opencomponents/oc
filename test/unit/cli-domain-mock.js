const expect = require('chai').expect;
const injectr = require('injectr');
const path = require('node:path');
const sinon = require('sinon');

const initialise = () => {
  const fsMock = {
    existsSync: sinon.stub(),
  };
  const ocConfigMock = {
    getOcConfig: sinon.stub().returns({ development: { plugins: {} } }),
    setOcConfig: sinon.stub()
  }

  const pathMock = {
    extname: path.extname,
    join: path.join,
    resolve: (...args) => args.join('/')
  };

  const Local = injectr(
    '../../dist/cli/domain/mock.js',
    {
      'fs-extra': fsMock,
      path: pathMock,
      './ocConfig': ocConfigMock
    },
    { __dirname: '' }
  ).default;

  const local = Local();

  return { local: local, fs: fsMock, ocConfig: ocConfigMock };
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

      data.ocConfig.getOcConfig.returns({ something: 'hello', development: { plugins: {} } });
      data.ocConfig.setOcConfig.returns('ok');

      executeMocking(data.local, 'plugin', 'getValue', 'value', done);
    });

    it('should add mock to oc.json', () => {
      expect(data.ocConfig.setOcConfig.called).to.be.true;
      expect(data.ocConfig.setOcConfig.args[0][0]).to.eql({
        something: 'hello',
        development: {
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

      data.ocConfig.getOcConfig.returns({ something: 'hello', development: { plugins: {} } });
      data.ocConfig.setOcConfig.returns('ok');

      executeMocking(data.local, 'plugin', 'isTrue', false, done);
    });

    it('should add mock to oc.json', () => {
      expect(data.ocConfig.setOcConfig.called).to.be.true;
      expect(data.ocConfig.setOcConfig.args[0][0]).to.eql({
        something: 'hello',
        development: {
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

      data.ocConfig.getOcConfig.returns({ something: 'hello', development: { plugins: {} } });
      data.fs.existsSync.returns(true);
      data.ocConfig.setOcConfig.returns('ok');

      executeMocking(data.local, 'plugin', 'getValue', './value.js', done);
    });

    it('should add mock to oc.json', () => {
      expect(data.ocConfig.setOcConfig.called).to.be.true;
      expect(data.ocConfig.setOcConfig.args[0][0]).to.eql({
        something: 'hello',
        development: {
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
