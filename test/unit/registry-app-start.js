const expect = require('chai').expect;
const injectr = require('injectr');
const sinon = require('sinon');
const path = require('node:path');

const getAppStart = (mockedRepository, options, callback) => {
  const appStart = injectr(
    '../../dist/registry/app-start.js',
    {
      'fs-extra': { readJsonSync: sinon.stub().returns({ version: '1.2.3' }) }
    },
    {
      console: { log: sinon.stub() },
      __dirname: path.resolve(__dirname, '../../dist/registry')
    }
  ).default;

  return appStart(mockedRepository, options).finally(callback);
};

const basicOptions = {
  storage: {
    options: {
      bucket: 'test',
      path: 'path',
      componentsDir: 'componentsDir'
    }
  }
};

describe('registry : app-start', () => {
  describe('when registry starting', () => {
    describe('when not in local mode', () => {
      describe('when oc-client found on library', () => {
        it('should not publish it', (done) => {
          const mockedRepository = {
            getComponentVersions: sinon.stub().resolves(['1.2.3']),
            publishComponent: sinon.spy()
          };

          getAppStart(mockedRepository, basicOptions, () => {
            expect(mockedRepository.publishComponent.called).to.be.false;
            done();
          });
        });
      });

      describe('when oc-client not found on library', () => {
        it('should publish it', (done) => {
          const mockedRepository = {
            getComponentVersions: sinon.stub().resolves(['1.0.0']),
            publishComponent: sinon.stub().yields(null, 'ok')
          };

          getAppStart(mockedRepository, basicOptions, () => {
            expect(mockedRepository.publishComponent.called).to.be.true;
            done();
          });
        });
      });
    });
  });
});
