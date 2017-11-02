'use strict';

const expect = require('chai').expect;
const injectr = require('injectr');
const path = require('path');
const sinon = require('sinon');
const _ = require('lodash');

const initialise = function() {
  const fsMock = {
    existsSync: sinon.stub(),
    lstatSync: sinon.stub(),
    mkdirSync: sinon.spy(),
    readdirSync: sinon.stub(),
    readFileSync: sinon.stub(),
    readJson: sinon.stub(),
    readJsonSync: sinon.stub(),
    writeFile: sinon.stub().yields(null, 'ok'),
    writeJson: sinon.stub().yields(null, 'ok')
  };

  const pathMock = {
    extname: path.extname,
    join: path.join,
    resolve: function() {
      return _.toArray(arguments).join('/');
    }
  };

  const Local = injectr(
    '../../src/cli/domain/mock.js',
    {
      'fs-extra': fsMock,
      path: pathMock
    },
    { __dirname: '' }
  );

  const local = new Local();

  return { local: local, fs: fsMock };
};

const executeMocking = function(local, type, name, value, cb) {
  return local(
    {
      targetType: type,
      targetName: name,
      targetValue: value
    },
    cb
  );
};

describe('cli : domain : mock', () => {
  describe('when mocking a static plugin', () => {
    let data;
    beforeEach(done => {
      data = initialise();

      data.fs.readJson.yields(null, { something: 'hello' });
      data.fs.writeJson.yields(null, 'ok');

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
    beforeEach(done => {
      data = initialise();

      data.fs.readJson.yields(null, { something: 'hello' });
      data.fs.writeJson.yields(null, 'ok');

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
    beforeEach(done => {
      data = initialise();

      data.fs.readJson.yields(null, { something: 'hello' });
      data.fs.existsSync.returns(true);
      data.fs.writeJson.yields(null, 'ok');

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
