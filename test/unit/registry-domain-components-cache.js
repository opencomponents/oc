'use strict';

const expect = require('chai').expect;
const injectr = require('injectr');
const sinon = require('sinon');

describe('registry : domain : components-cache', () => {
  const mockedCdn = {
    getJson: sinon.stub(),
    listSubDirectories: sinon.stub(),
    putFileContent: sinon.stub()
  };

  const baseOptions = {
    pollingInterval: 5,
    storage: {
      options: {
        componentsDir: 'component'
      }
    }
  };

  const baseResponse = () => ({
    lastEdit: 12345678,
    components: { 'hello-world': ['1.0.0', '1.0.2'] }
  });

  let setTimeoutStub, clearTimeoutStub, componentsCache, eventsHandlerStub;

  const getTimestamp = () => 12345678;

  const initialise = function() {
    clearTimeoutStub = sinon.stub();
    setTimeoutStub = sinon.stub();
    eventsHandlerStub = { fire: sinon.stub() };
    const ComponentsCache = injectr(
      '../../src/registry/domain/components-cache/index.js',
      {
        'oc-get-unix-utc-timestamp': getTimestamp,
        '../events-handler': eventsHandlerStub,
        './components-list': injectr(
          '../../src/registry/domain/components-cache/components-list.js',
          {
            'oc-get-unix-utc-timestamp': getTimestamp
          }
        )
      },
      {
        setTimeout: setTimeoutStub,
        clearTimeout: clearTimeoutStub
      }
    );

    componentsCache = ComponentsCache(baseOptions, mockedCdn);
  };

  describe('when library does not contain components.json', () => {
    describe('when initialising the cache', () => {
      before(done => {
        mockedCdn.getJson = sinon.stub();
        mockedCdn.getJson.yields('not_found');
        mockedCdn.listSubDirectories = sinon.stub();
        mockedCdn.listSubDirectories.onCall(0).yields(null, ['hello-world']);
        mockedCdn.listSubDirectories.onCall(1).yields(null, ['1.0.0', '1.0.2']);
        mockedCdn.putFileContent = sinon.stub();
        mockedCdn.putFileContent.yields(null, 'ok');
        initialise();
        componentsCache.load(done);
      });

      it('should try fetching the components.json', () => {
        expect(mockedCdn.getJson.calledOnce).to.be.true;
        expect(mockedCdn.getJson.args[0][0]).to.be.equal(
          'component/components.json'
        );
      });

      it('should scan for directories to fetch components and versions', () => {
        expect(mockedCdn.listSubDirectories.calledTwice).to.be.true;
      });

      it("should then save the directories' data to components.json file in cdn", () => {
        expect(mockedCdn.putFileContent.called).to.be.true;
        expect(mockedCdn.putFileContent.args[0][2]).to.be.true;
        expect(JSON.parse(mockedCdn.putFileContent.args[0][0])).to.eql({
          lastEdit: 12345678,
          components: {
            'hello-world': ['1.0.0', '1.0.2']
          }
        });
      });

      it('should start the refresh loop', () => {
        expect(setTimeoutStub.called).to.be.true;
        expect(setTimeoutStub.args[0][1]).to.equal(5000);
      });
    });
  });

  describe('when library contains outdated components.json', () => {
    describe('when initialising the cache', () => {
      before(done => {
        mockedCdn.getJson = sinon.stub();
        mockedCdn.getJson.yields(null, baseResponse());
        mockedCdn.listSubDirectories = sinon.stub();
        mockedCdn.listSubDirectories.onCall(0).yields(null, ['hello-world']);
        mockedCdn.listSubDirectories
          .onCall(1)
          .yields(null, ['1.0.0', '1.0.2', '2.0.0']);
        mockedCdn.putFileContent = sinon.stub();
        mockedCdn.putFileContent.yields(null, 'ok');
        initialise();
        componentsCache.load(done);
      });

      it('should fetch the components.json', () => {
        expect(mockedCdn.getJson.calledOnce).to.be.true;
        expect(mockedCdn.getJson.args[0][0]).to.be.equal(
          'component/components.json'
        );
      });

      it('should scan for directories to fetch components and versions', () => {
        expect(mockedCdn.listSubDirectories.calledTwice).to.be.true;
      });

      it("should then save the directories' data to components.json file in cdn", () => {
        expect(mockedCdn.putFileContent.called).to.be.true;
        expect(mockedCdn.putFileContent.args[0][2]).to.be.true;
        expect(JSON.parse(mockedCdn.putFileContent.args[0][0])).to.eql({
          lastEdit: 12345678,
          components: {
            'hello-world': ['1.0.0', '1.0.2', '2.0.0']
          }
        });
      });

      it('should start the refresh loop', () => {
        expect(setTimeoutStub.called).to.be.true;
        expect(setTimeoutStub.args[0][1]).to.equal(5000);
      });
    });
  });

  describe('when library contains updated components.json', () => {
    describe('when initialising the cache', () => {
      before(done => {
        mockedCdn.getJson = sinon.stub();
        mockedCdn.getJson.yields(null, baseResponse());
        mockedCdn.listSubDirectories = sinon.stub();
        mockedCdn.listSubDirectories.onCall(0).yields(null, ['hello-world']);
        mockedCdn.listSubDirectories.onCall(1).yields(null, ['1.0.0', '1.0.2']);
        mockedCdn.putFileContent = sinon.stub();
        initialise();
        componentsCache.load(done);
      });

      it('should fetch the components.json', () => {
        expect(mockedCdn.getJson.calledOnce).to.be.true;
        expect(mockedCdn.getJson.args[0][0]).to.be.equal(
          'component/components.json'
        );
      });

      it('should scan for directories to fetch components and versions', () => {
        expect(mockedCdn.listSubDirectories.calledTwice).to.be.true;
      });

      it('should not modify components.json', () => {
        expect(mockedCdn.putFileContent.called).to.be.false;
      });

      it('should use it as a source of truth', done => {
        componentsCache.get((err, res) => {
          expect(res).to.eql({
            lastEdit: 12345678,
            components: {
              'hello-world': ['1.0.0', '1.0.2']
            }
          });
          done();
        });
      });

      it('should start the refresh loop', () => {
        expect(setTimeoutStub.called).to.be.true;
        expect(setTimeoutStub.args[0][1]).to.equal(5000);
      });
    });

    describe('when refreshing the cache', () => {
      const baseResponseUpdated = baseResponse();
      baseResponseUpdated.components['hello-world'].push('2.0.0');
      baseResponseUpdated.components['new-component'] = ['1.0.0'];
      baseResponseUpdated.lastEdit++;

      describe('when refresh errors', () => {
        before(done => {
          mockedCdn.getJson = sinon.stub();
          mockedCdn.getJson.yields(null, baseResponse());
          mockedCdn.putFileContent = sinon.stub();
          mockedCdn.putFileContent.yields(null, 'ok');
          mockedCdn.listSubDirectories = sinon.stub();
          mockedCdn.listSubDirectories.onCall(0).yields(null, ['hello-world']);
          mockedCdn.listSubDirectories
            .onCall(1)
            .yields(null, ['1.0.0', '1.0.2']);
          mockedCdn.listSubDirectories
            .onCall(2)
            .yields(null, ['hello-world', 'new-component']);
          mockedCdn.listSubDirectories.onCall(3).yields('an error!');
          mockedCdn.listSubDirectories.onCall(4).yields(null, ['1.0.0']);

          initialise();
          componentsCache.load(() => {
            componentsCache.refresh(() => done());
          });
        });

        it('should generate an error event', () => {
          expect(eventsHandlerStub.fire.called).to.be.true;
          expect(eventsHandlerStub.fire.args[0][0]).to.equal('error');
          expect(eventsHandlerStub.fire.args[0][1].code).to.equal(
            'components_cache_refresh'
          );
          expect(eventsHandlerStub.fire.args[0][1].message).to.contain(
            'an error!'
          );
        });
      });

      describe('when refresh does not generate errors', () => {
        before(done => {
          mockedCdn.getJson = sinon.stub();
          mockedCdn.getJson.yields(null, baseResponse());
          mockedCdn.putFileContent = sinon.stub();
          mockedCdn.putFileContent.yields(null, 'ok');
          mockedCdn.listSubDirectories = sinon.stub();
          mockedCdn.listSubDirectories.onCall(0).yields(null, ['hello-world']);
          mockedCdn.listSubDirectories
            .onCall(1)
            .yields(null, ['1.0.0', '1.0.2']);
          mockedCdn.listSubDirectories
            .onCall(2)
            .yields(null, ['hello-world', 'new-component']);
          mockedCdn.listSubDirectories
            .onCall(3)
            .yields(null, ['1.0.0', '1.0.2', '2.0.0']);
          mockedCdn.listSubDirectories.onCall(4).yields(null, ['1.0.0']);

          initialise();
          componentsCache.load(() => {
            componentsCache.refresh(done);
          });
        });

        it('should have started, stopped and restarted the refresh loop', () => {
          expect(setTimeoutStub.calledTwice).to.be.true;
          expect(clearTimeoutStub.calledOnce).to.be.true;
        });

        it('should do list requests to cdn', () => {
          expect(mockedCdn.listSubDirectories.args.length).to.equal(5);
        });

        it('should do write request to cdn', () => {
          expect(mockedCdn.putFileContent.calledOnce).to.be.true;
        });

        it('should refresh the values', done => {
          componentsCache.get((err, data) => {
            expect(data.lastEdit).to.equal(12345678);
            expect(data.components['new-component']).to.eql(['1.0.0']);
            expect(data.components['hello-world'].length).to.equal(3);
            done();
          });
        });
      });
    });
  });
});
