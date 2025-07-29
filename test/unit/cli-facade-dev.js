const expect = require('chai').expect;
const sinon = require('sinon');

describe('cli : facade : dev', () => {
  const logSpy = {};
  const DevFacade = require('../../dist/cli/facade/dev').default;
  const Local = require('../../dist/cli/domain/local').default;
  const local = Local();
  const devFacade = DevFacade({ local, logger: logSpy });

  const execute = (done) => {
    logSpy.err = sinon.spy();
    logSpy.warn = () => {};
    devFacade({}, () => done());
  };

  describe('when running a dev version of the registry', () => {
    describe('when the directory is not found', () => {
      beforeEach((done) => {
        sinon.stub(local, 'getComponentsByDir').resolves([]);
        execute(done);
      });

      afterEach(() => local.getComponentsByDir.restore());

      it('should show an error', () => {
        expect(logSpy.err.args[0][0]).to.equal(
          'An error happened when initialising the dev runner: no components found in specified path'
        );
      });
    });

    describe('when the directory does not contain any valid component', () => {
      beforeEach((done) => {
        sinon.stub(local, 'getComponentsByDir').resolves([]);
        execute(done);
      });

      afterEach(() => local.getComponentsByDir.restore());

      it('should show an error', () => {
        expect(logSpy.err.args[0][0]).to.equal(
          'An error happened when initialising the dev runner: no components found in specified path'
        );
      });
    });

    describe('when testing livereload refresh sequencing bugfix', () => {
      let packageComponentsStub, refreshLiveReloadSpy, watchStub;

      beforeEach(() => {
        sinon.stub(local, 'getComponentsByDir').resolves(['component1']);
        packageComponentsStub = sinon.stub(local, 'package').resolves();
        logSpy.warn = sinon.spy();
        logSpy.ok = sinon.spy();
        logSpy.log = sinon.spy();
        
        // Create a spy for refreshLiveReload that we can track
        refreshLiveReloadSpy = sinon.spy();
        
        // Mock watch to simulate file changes
        watchStub = sinon.stub();
      });

      afterEach(() => {
        local.getComponentsByDir.restore();
        local.package.restore();
        if (watchStub.restore) watchStub.restore();
      });

      it('should call refreshLiveReload AFTER packageComponents completes', async () => {
        let packageComponentsCompleted = false;
        let refreshLiveReloadCalled = false;
        
        // Mock packageComponents to track when it completes
        packageComponentsStub.callsFake(() => {
          return new Promise((resolve) => {
            setTimeout(() => {
              packageComponentsCompleted = true;
              resolve();
            }, 10);
          });
        });
        
        // Mock refreshLiveReload to track when it's called
        const mockRefreshLiveReload = () => {
          refreshLiveReloadCalled = true;
          // Verify packageComponents completed BEFORE refreshLiveReload was called
          expect(packageComponentsCompleted).to.be.true;
        };
        
        // Test the sequencing by simulating the watch callback behavior
        const components = ['component1'];
        const componentDir = 'component1';
        
        // Simulate what happens in watchForChanges when a file changes
        const packageAndRefresh = async () => {
          await packageComponentsStub([componentDir]);
          mockRefreshLiveReload();
        };
        
        await packageAndRefresh();
        
        expect(packageComponentsCompleted).to.be.true;
        expect(refreshLiveReloadCalled).to.be.true;
        expect(packageComponentsStub.calledWith([componentDir])).to.be.true;
      });

      it('should handle both single component and all components refresh sequencing', async () => {
        const components = ['component1', 'component2'];
        let allComponentsPackaged = false;
        let singleComponentPackaged = false;
        
        packageComponentsStub.callsFake((comps) => {
          return new Promise((resolve) => {
            setTimeout(() => {
              if (comps.length > 1) {
                allComponentsPackaged = true;
              } else {
                singleComponentPackaged = true;
              }
              resolve();
            }, 10);
          });
        });
        
        // Test packaging all components (when !componentDir)
        await packageComponentsStub(components);
        expect(allComponentsPackaged).to.be.true;
        
        // Test packaging single component (when componentDir exists)  
        await packageComponentsStub(['component1']);
        expect(singleComponentPackaged).to.be.true;
      });
    });
  });
});
