const expect = require('chai').expect;
const injectr = require('injectr');
const sinon = require('sinon');

describe('registry : domain : components-cache', () => {
  const mockedCdn = {
    getJson: sinon.stub(),
    listSubDirectories: sinon.stub(),
    putFileContent: sinon.stub(),
    maxConcurrentRequests: 10
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

  let setTimeoutStub;
  let clearTimeoutStub;
  let componentsCache;
  let eventsHandlerStub;

  const getTimestamp = () => 12345678;

  const initialise = (metadataIndex) => {
    clearTimeoutStub = sinon.stub();
    setTimeoutStub = sinon.stub();
    eventsHandlerStub = { fire: sinon.stub() };
    const ComponentsCache = injectr(
      '../../dist/registry/domain/components-cache/index.js',
      {
        'oc-get-unix-utc-timestamp': getTimestamp,
        '../events-handler': eventsHandlerStub,
        './components-list': injectr(
          '../../dist/registry/domain/components-cache/components-list.js',
          {
            'oc-get-unix-utc-timestamp': getTimestamp,
            '../events-handler': eventsHandlerStub
          }
        ).default
      },
      {
        setTimeout: setTimeoutStub,
        clearTimeout: clearTimeoutStub
      }
    ).default;

    componentsCache = ComponentsCache(baseOptions, mockedCdn, metadataIndex);
  };

  describe('when library does not contain components.json', () => {
    describe('when getting the json fails', () => {
      let error;
      before((done) => {
        mockedCdn.getJson = sinon.stub();
        mockedCdn.getJson.rejects(new Error('FILE_ERROR'));
        initialise();
        componentsCache
          .load()
          .catch((err) => {
            error = err;
          })
          .finally(done);
      });

      it('should throw with the error message', () => {
        expect(error.message).to.equal('FILE_ERROR');
      });
    });
    describe('when initialising the cache', () => {
      before((done) => {
        mockedCdn.getJson = sinon.stub();
        mockedCdn.getJson.resolves({});
        mockedCdn.getJson.onFirstCall(0).rejects({ code: 'file_not_found' });
        mockedCdn.listSubDirectories = sinon.stub();
        mockedCdn.listSubDirectories.onCall(0).resolves(['hello-world']);
        mockedCdn.listSubDirectories.onCall(1).resolves(['1.0.0', '1.0.2']);
        mockedCdn.putFileContent = sinon.stub();
        mockedCdn.putFileContent.resolves('ok');
        initialise();
        componentsCache.load().finally(done);
      });

      it('should try fetching the components.json and check components', () => {
        expect(mockedCdn.getJson.calledThrice).to.be.true;
        expect(mockedCdn.getJson.args[0][0]).to.be.equal(
          'component/components.json'
        );
        expect(mockedCdn.getJson.args[1][0]).to.be.equal(
          'component/hello-world/1.0.0/package.json'
        );
        expect(mockedCdn.getJson.args[2][0]).to.be.equal(
          'component/hello-world/1.0.2/package.json'
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
      before((done) => {
        mockedCdn.getJson = sinon.stub();
        mockedCdn.getJson.resolves(baseResponse());
        mockedCdn.getJson
          .withArgs('component/hello-world/3.0.0/package.json')
          .rejects('ERROR');
        mockedCdn.listSubDirectories = sinon.stub();
        mockedCdn.listSubDirectories.onCall(0).resolves(['hello-world']);
        mockedCdn.listSubDirectories
          .onCall(1)
          .resolves(['1.0.0', '1.0.2', '2.0.0', '3.0.0']);
        mockedCdn.putFileContent = sinon.stub();
        mockedCdn.putFileContent.resolves('ok');
        initialise();
        componentsCache.load().finally(done);
      });

      it('should fetch the components.json', () => {
        expect(mockedCdn.getJson.args[0][0]).to.be.equal(
          'component/components.json'
        );
      });

      it('should verify new versions', () => {
        expect(mockedCdn.getJson.calledThrice).to.be.true;
        expect(mockedCdn.getJson.args[1][0]).to.be.equal(
          'component/hello-world/2.0.0/package.json'
        );
        expect(mockedCdn.getJson.args[2][0]).to.be.equal(
          'component/hello-world/3.0.0/package.json'
        );
      });

      it('should ignore corrupted versions and generate an error event', () => {
        expect(eventsHandlerStub.fire.called).to.be.true;
        expect(eventsHandlerStub.fire.args[0][0]).to.equal('error');
        expect(eventsHandlerStub.fire.args[0][1].code).to.equal(
          'corrupted_version'
        );
        expect(eventsHandlerStub.fire.args[0][1].message).to.contain(
          'hello-world'
        );
        expect(eventsHandlerStub.fire.args[0][1].message).to.contain('3.0.0');
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
      before((done) => {
        mockedCdn.getJson = sinon.stub();
        mockedCdn.getJson.resolves(baseResponse());
        mockedCdn.listSubDirectories = sinon.stub();
        mockedCdn.listSubDirectories.onCall(0).resolves(['hello-world']);
        mockedCdn.listSubDirectories.onCall(1).resolves(['1.0.0', '1.0.2']);
        mockedCdn.putFileContent = sinon.stub();
        initialise();
        componentsCache.load().finally(done);
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

      it('should use it as a source of truth', () => {
        const res = componentsCache.get();
        expect(res).to.eql({
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

    describe('when refreshing the cache', () => {
      const baseResponseUpdated = baseResponse();
      baseResponseUpdated.components['hello-world'].push('2.0.0');
      baseResponseUpdated.components['new-component'] = ['1.0.0'];
      baseResponseUpdated.lastEdit++;

      describe('when refresh errors', () => {
        before((done) => {
          mockedCdn.getJson = sinon.stub();
          mockedCdn.getJson.resolves(baseResponse());
          mockedCdn.putFileContent = sinon.stub();
          mockedCdn.putFileContent.resolves('ok');
          mockedCdn.listSubDirectories = sinon.stub();
          mockedCdn.listSubDirectories.onCall(0).resolves(['hello-world']);
          mockedCdn.listSubDirectories.onCall(1).resolves(['1.0.0', '1.0.2']);
          mockedCdn.listSubDirectories
            .onCall(2)
            .resolves(['hello-world', 'new-component']);
          mockedCdn.listSubDirectories
            .onCall(3)
            .rejects(new Error('an error!'));
          mockedCdn.listSubDirectories.onCall(4).resolves(['1.0.0']);

          initialise();
          componentsCache
            .load()
            .then(() => componentsCache.refresh().finally(done));
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
        before((done) => {
          mockedCdn.getJson = sinon.stub();
          mockedCdn.getJson.resolves(baseResponse());
          mockedCdn.putFileContent = sinon.stub();
          mockedCdn.putFileContent.resolves('ok');
          mockedCdn.listSubDirectories = sinon.stub();
          mockedCdn.listSubDirectories.onCall(0).resolves(['hello-world']);
          mockedCdn.listSubDirectories.onCall(1).resolves(['1.0.0', '1.0.2']);
          mockedCdn.listSubDirectories
            .onCall(2)
            .resolves(['hello-world', 'new-component']);
          mockedCdn.listSubDirectories
            .onCall(3)
            .resolves(['1.0.0', '1.0.2', '2.0.0']);
          mockedCdn.listSubDirectories.onCall(4).resolves(['1.0.0']);

          initialise();
          componentsCache
            .load()
            .then(() => componentsCache.refresh().finally(done));
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

        it('should refresh the values', () => {
          const data = componentsCache.get();
          expect(data.lastEdit).to.equal(12345678);
          expect(data.components['new-component']).to.eql(['1.0.0']);
          expect(data.components['hello-world'].length).to.equal(3);
        });
      });
    });
  });

  describe('when metadata store is configured', () => {
    let metadataIndex;

    before((done) => {
      mockedCdn.getJson = sinon.stub();
      mockedCdn.listSubDirectories = sinon.stub();
      mockedCdn.putFileContent = sinon.stub();
      metadataIndex = {
        get: sinon.stub().returns(undefined),
        refresh: sinon.stub().resolves({
          componentsList: {
            lastEdit: 123,
            components: {
              'hello-world': ['1.0.0', '1.0.2'],
              'new-component': ['2.0.0']
            }
          }
        })
      };
      initialise(metadataIndex);
      componentsCache.load().finally(done);
    });

    it('should hydrate the cache from the metadata store', () => {
      expect(metadataIndex.refresh.calledOnce).to.be.true;
      expect(componentsCache.get().components).to.eql({
        'hello-world': ['1.0.0', '1.0.2'],
        'new-component': ['2.0.0']
      });
      expect(componentsCache.get().lastEdit).to.be.a('number');
    });

    it('should read the latest metadata snapshot on get', () => {
      metadataIndex.get.returns({
        componentsList: {
          lastEdit: 124,
          components: {
            'hello-world': ['1.0.0', '1.0.1', '1.0.2'],
            'new-component': ['2.0.0']
          }
        }
      });

      expect(componentsCache.get().components).to.eql({
        'hello-world': ['1.0.0', '1.0.1', '1.0.2'],
        'new-component': ['2.0.0']
      });
    });

    it('should not scan or write storage metadata files', () => {
      expect(mockedCdn.getJson.called).to.be.false;
      expect(mockedCdn.listSubDirectories.called).to.be.false;
      expect(mockedCdn.putFileContent.called).to.be.false;
    });

    it('should keep serving cached metadata when polling fails', async () => {
      const pollError = new Error('database unavailable');
      metadataIndex = {
        get: sinon.stub().returns(undefined),
        refresh: sinon.stub()
      };
      metadataIndex.refresh.onFirstCall().resolves({
        componentsList: {
          lastEdit: 123,
          components: {
            'hello-world': ['1.0.0']
          }
        }
      });
      metadataIndex.refresh.onSecondCall().rejects(pollError);
      initialise(metadataIndex);

      await componentsCache.load();
      await setTimeoutStub.args[0][0]();

      expect(componentsCache.get().components).to.eql({
        'hello-world': ['1.0.0']
      });
      expect(eventsHandlerStub.fire.args[0][0]).to.equal('error');
      expect(eventsHandlerStub.fire.args[0][1]).to.eql({
        code: 'components_list_get',
        message: pollError.message
      });
    });

    it('should not restart the polling loop when closed during a poll', async () => {
      let resolvePoll;
      metadataIndex = {
        get: sinon.stub().returns(undefined),
        refresh: sinon.stub()
      };
      metadataIndex.refresh.onFirstCall().resolves({
        componentsList: {
          lastEdit: 123,
          components: {
            'hello-world': ['1.0.0']
          }
        }
      });
      metadataIndex.refresh.onSecondCall().returns(
        new Promise((resolve) => {
          resolvePoll = resolve;
        })
      );
      initialise(metadataIndex);

      await componentsCache.load();
      const poll = setTimeoutStub.args[0][0];
      setTimeoutStub.resetHistory();
      const pollPromise = poll();
      componentsCache.close();
      resolvePoll({
        componentsList: {
          lastEdit: 124,
          components: {
            'hello-world': ['1.0.0', '1.0.1']
          }
        }
      });
      await pollPromise;

      expect(setTimeoutStub.called).to.be.false;
    });
  });
});

describe('registry : domain : components-cache : global concurrency', () => {
  const getTimestamp = () => 12345678;

  const createTrackedCdn = ({
    components,
    versionsMap,
    maxConcurrentRequests,
    delayMs = 5,
    corruptVersions = new Set(),
    failingComponentDirs = new Set(),
    failingVersions = new Set()
  }) => {
    let active = 0;
    let maxActive = 0;
    let listCalls = 0;
    let jsonCalls = 0;

    const inc = () => {
      active++;
      if (active > maxActive) maxActive = active;
    };
    const dec = () => {
      active--;
    };

    const cdn = {
      maxConcurrentRequests,
      listSubDirectories: sinon.stub().callsFake(async (path) => {
        inc();
        listCalls++;
        try {
          await new Promise((r) => setTimeout(r, delayMs));
          if (failingComponentDirs.has(path)) {
            const err = new Error('dir error');
            err.code = 'dir_error';
            throw err;
          }
          if (path === 'component') {
            return [...components];
          }
          // component path like component/comp-a
          const comp = path.split('/').pop();
          if (versionsMap[comp]) return [...versionsMap[comp]];
          return [];
        } finally {
          dec();
        }
      }),
      getJson: sinon.stub().callsFake(async (path) => {
        inc();
        jsonCalls++;
        try {
          await new Promise((r) => setTimeout(r, delayMs));
          // path like component/comp-a/1.0.1/package.json
          const match = path.match(/component\/([^\/]+)\/([^\/]+)\/package\.json/);
          if (match) {
            const comp = match[1];
            const ver = match[2];
            const key = `${comp}/${ver}`;
            if (failingVersions.has(key)) {
              throw new Error('getJson failure');
            }
            if (corruptVersions.has(key)) {
              throw new Error('corrupt');
            }
          }
          return {};
        } finally {
          dec();
        }
      }),
      putFileContent: sinon.stub().resolves('ok'),
      _getActive: () => active,
      _getMaxActive: () => maxActive,
      _getListCalls: () => listCalls,
      _getJsonCalls: () => jsonCalls
    };
    return cdn;
  };

  const loadComponentsList = (cdn, jsonList) => {
    const eventsHandlerStub = { fire: sinon.stub() };
    const ComponentsList = injectr(
      '../../dist/registry/domain/components-cache/components-list.js',
      {
        'oc-get-unix-utc-timestamp': getTimestamp,
        '../events-handler': eventsHandlerStub
      }
    ).default;
    const conf = {
      storage: { options: { componentsDir: 'component' } }
    };
    const list = ComponentsList(conf, cdn);
    return { list, eventsHandlerStub };
  };

  it('shares one budget across directory listings and integrity reads', async () => {
    const components = ['comp-a', 'comp-b', 'comp-c'];
    const versionsMap = {
      'comp-a': ['1.0.0', '1.0.1', '1.0.2', '2.0.0'],
      'comp-b': ['1.0.0', '1.0.1', '1.0.2', '2.0.0'],
      'comp-c': ['1.0.0', '1.0.1', '1.0.2', '2.0.0']
    };
    const jsonList = {
      lastEdit: 1,
      components: {
        'comp-a': ['1.0.0'],
        'comp-b': ['1.0.0'],
        'comp-c': ['1.0.0']
      }
    };
    const cdn = createTrackedCdn({
      components,
      versionsMap,
      maxConcurrentRequests: 2,
      delayMs: 5
    });
    const { list, eventsHandlerStub } = loadComponentsList(cdn, jsonList);

    const result = await list.getFromDirectories(jsonList);

    expect(result.components).to.eql({
      'comp-a': ['1.0.0', '1.0.1', '1.0.2', '2.0.0'],
      'comp-b': ['1.0.0', '1.0.1', '1.0.2', '2.0.0'],
      'comp-c': ['1.0.0', '1.0.1', '1.0.2', '2.0.0']
    });
    expect(cdn._getMaxActive()).to.equal(2);
    expect(cdn._getMaxActive()).to.be.at.most(2);
    expect(cdn._getActive()).to.equal(0);
    expect(cdn._getListCalls()).to.equal(4); // root + 3 components
    expect(cdn._getJsonCalls()).to.equal(9); // 3 unchecked per 3 components
    expect(eventsHandlerStub.fire.called).to.be.false;
  });

  it('caps concurrency at 1 when configured', async () => {
    const components = ['comp-a', 'comp-b'];
    const versionsMap = {
      'comp-a': ['1.0.0', '1.0.1'],
      'comp-b': ['1.0.0', '1.0.1']
    };
    const jsonList = {
      lastEdit: 1,
      components: { 'comp-a': ['1.0.0'], 'comp-b': ['1.0.0'] }
    };
    const cdn = createTrackedCdn({
      components,
      versionsMap,
      maxConcurrentRequests: 1,
      delayMs: 5
    });
    const { list } = loadComponentsList(cdn, jsonList);
    const result = await list.getFromDirectories(jsonList);
    expect(result.components).to.eql({
      'comp-a': ['1.0.0', '1.0.1'],
      'comp-b': ['1.0.0', '1.0.1']
    });
    expect(cdn._getMaxActive()).to.equal(1);
    expect(cdn._getActive()).to.equal(0);
  });

  it('completes with capacity larger than total work', async () => {
    const components = ['comp-a'];
    const versionsMap = { 'comp-a': ['1.0.0', '1.0.1'] };
    const jsonList = { lastEdit: 1, components: { 'comp-a': ['1.0.0'] } };
    const cdn = createTrackedCdn({
      components,
      versionsMap,
      maxConcurrentRequests: 10,
      delayMs: 5
    });
    const { list } = loadComponentsList(cdn, jsonList);
    const result = await list.getFromDirectories(jsonList);
    expect(result.components).to.eql({ 'comp-a': ['1.0.0', '1.0.1'] });
    expect(cdn._getMaxActive()).to.be.at.most(2); // only 1 component + 1 unchecked, so max 1-2
    expect(cdn._getActive()).to.equal(0);
  });

  it('marks only the failing version invalid on getJson rejection', async () => {
    const components = ['comp-a'];
    const versionsMap = { 'comp-a': ['1.0.0', '1.0.1', '1.0.2'] };
    const jsonList = { lastEdit: 1, components: { 'comp-a': ['1.0.0'] } };
    const cdn = createTrackedCdn({
      components,
      versionsMap,
      maxConcurrentRequests: 2,
      delayMs: 5,
      corruptVersions: new Set(['comp-a/1.0.1'])
    });
    const { list, eventsHandlerStub } = loadComponentsList(cdn, jsonList);
    const result = await list.getFromDirectories(jsonList);
    expect(result.components).to.eql({ 'comp-a': ['1.0.0', '1.0.2'] });
    expect(eventsHandlerStub.fire.calledOnce).to.be.true;
    expect(eventsHandlerStub.fire.args[0][1].message).to.contain('1.0.1');
    expect(cdn._getActive()).to.equal(0);
  });

  it('propagates component directory-list rejection', async () => {
    const components = ['comp-a', 'comp-b'];
    const versionsMap = {
      'comp-a': ['1.0.0'],
      'comp-b': ['1.0.0']
    };
    const jsonList = { lastEdit: 1, components: {} };
    const cdn = createTrackedCdn({
      components,
      versionsMap,
      maxConcurrentRequests: 2,
      delayMs: 5,
      failingComponentDirs: new Set(['component/comp-b'])
    });
    const { list } = loadComponentsList(cdn, jsonList);
    let err;
    try {
      await list.getFromDirectories(jsonList);
    } catch (e) {
      err = e;
    }
    expect(err).to.exist;
    expect(err.code).to.equal('dir_error');
    expect(cdn._getActive()).to.equal(0);
  });

  it('handles empty registry and components with no unchecked versions without extra reads', async () => {
    const cdnEmpty = createTrackedCdn({
      components: [],
      versionsMap: {},
      maxConcurrentRequests: 2,
      delayMs: 5
    });
    const { list: listEmpty } = loadComponentsList(cdnEmpty, null);
    // Need to stub root list to return [] and not throw
    // createTrackedCdn already returns [] for unknown path, but for 'component' it returns components []
    const resEmpty = await listEmpty.getFromDirectories(null);
    expect(resEmpty.components).to.eql({});
    expect(cdnEmpty._getListCalls()).to.equal(1); // only root
    expect(cdnEmpty._getJsonCalls()).to.equal(0);
    expect(cdnEmpty._getActive()).to.equal(0);

    const components = ['comp-a'];
    const versionsMap = { 'comp-a': ['1.0.0'] };
    const jsonList = { lastEdit: 1, components: { 'comp-a': ['1.0.0'] } };
    const cdnNoUnchecked = createTrackedCdn({
      components,
      versionsMap,
      maxConcurrentRequests: 2,
      delayMs: 5
    });
    const { list } = loadComponentsList(cdnNoUnchecked, jsonList);
    const res = await list.getFromDirectories(jsonList);
    expect(res.components).to.eql({ 'comp-a': ['1.0.0'] });
    expect(cdnNoUnchecked._getJsonCalls()).to.equal(0);
    expect(cdnNoUnchecked._getActive()).to.equal(0);
  });

  it('leaves no queued work after rejection', async () => {
    const components = ['comp-a', 'comp-b', 'comp-c', 'comp-d'];
    const versionsMap = {
      'comp-a': ['1.0.0'],
      'comp-b': ['1.0.0'],
      'comp-c': ['1.0.0'],
      'comp-d': ['1.0.0']
    };
    const jsonList = { lastEdit: 1, components: {} };
    const cdn = createTrackedCdn({
      components,
      versionsMap,
      maxConcurrentRequests: 2,
      delayMs: 5,
      failingComponentDirs: new Set(['component/comp-b'])
    });
    const { list } = loadComponentsList(cdn, jsonList);
    let err;
    try {
      await list.getFromDirectories(jsonList);
    } catch (e) {
      err = e;
    }
    expect(err).to.exist;
    // Give any queued timers a chance to run
    await new Promise((r) => setTimeout(r, 20));
    expect(cdn._getActive()).to.equal(0);
    // No unhandled rejection should have occurred; test would have failed otherwise
  });

  it('preserves semver ordering of valid versions', async () => {
    const components = ['comp-a'];
    const versionsMap = { 'comp-a': ['2.0.0', '1.0.10', '1.0.2'] };
    const jsonList = { lastEdit: 1, components: { 'comp-a': [] } };
    const cdn = createTrackedCdn({
      components,
      versionsMap,
      maxConcurrentRequests: 2,
      delayMs: 5
    });
    const { list } = loadComponentsList(cdn, jsonList);
    const result = await list.getFromDirectories(jsonList);
    expect(result.components['comp-a']).to.eql(['1.0.2', '1.0.10', '2.0.0']);
  });
});

describe('registry : domain : metadata-index', () => {
  const { createMetadataIndex } = require('../../dist/registry/domain/metadata-index');

  it('should reuse the hydrated snapshot until refreshed', async () => {
    const metadataStore = {
      getAllComponents: sinon.stub().resolves([
        {
          name: 'hello-world',
          version: '1.0.0',
          publishDate: 123,
          templateSize: 10
        }
      ])
    };
    const metadataIndex = createMetadataIndex(metadataStore);

    const first = await metadataIndex.refresh();
    const second = await metadataIndex.getOrRefresh();

    expect(metadataStore.getAllComponents.calledOnce).to.be.true;
    expect(second).to.equal(first);
    expect(second.componentsList.components).to.eql({
      'hello-world': ['1.0.0']
    });
    expect(second.componentsDetails.components).to.eql({
      'hello-world': {
        '1.0.0': { publishDate: 123, templateSize: 10 }
      }
    });
  });

  it('should update the hydrated snapshot when a row is added', async () => {
    const metadataStore = {
      getAllComponents: sinon.stub().resolves([
        {
          name: 'hello-world',
          version: '1.0.0',
          publishDate: 123,
          templateSize: 10
        },
        {
          name: 'hello-world',
          version: '1.0.2',
          publishDate: 125,
          templateSize: 12
        }
      ])
    };
    const metadataIndex = createMetadataIndex(metadataStore);

    await metadataIndex.refresh();
    const snapshot = metadataIndex.add({
      name: 'hello-world',
      version: '1.0.1',
      publishDate: 124,
      templateSize: 11
    });

    expect(metadataStore.getAllComponents.calledOnce).to.be.true;
    expect(metadataIndex.get()).to.equal(snapshot);
    expect(snapshot.componentsList.components).to.eql({
      'hello-world': ['1.0.0', '1.0.1', '1.0.2']
    });
    expect(snapshot.componentsDetails.components).to.eql({
      'hello-world': {
        '1.0.0': { publishDate: 123, templateSize: 10 },
        '1.0.1': { publishDate: 124, templateSize: 11 },
        '1.0.2': { publishDate: 125, templateSize: 12 }
      }
    });
  });
});
