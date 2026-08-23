const Client = require('oc-client');
const expect = require('chai').expect;
const injectr = require('injectr');
const sinon = require('sinon');

describe('registry : routes : helpers : get-component timing', () => {
  const mockedComponents = require('../fixtures/mocked-components');
  const simpleView = mockedComponents['simple-component'].view;
  const noop = () => {};

  const PROVIDERS = {
    syncSuccess:
      '"use strict";module.exports.data=function(ctx,cb){cb(null,{done:true});};',
    asyncSuccess:
      '"use strict";module.exports.data=function(ctx,cb){setTimeout(function(){cb(null,{done:true});},0);};',
    syncThrow:
      '"use strict";module.exports.data=function(){throw new Error("sync boom");};',
    syncErrorCallback:
      '"use strict";module.exports.data=function(ctx,cb){cb(new Error("boom"));};',
    asyncErrorCallback:
      '"use strict";module.exports.data=function(ctx,cb){setTimeout(function(){cb(new Error("async boom"));},0);};',
    doubleCallback:
      '"use strict";module.exports.data=function(ctx,cb){cb(null,{n:1});cb(null,{n:2});};',
    tracedAsyncSuccess:
      '"use strict";module.exports.data=function(ctx,cb){console.log("provider-invoked");setTimeout(function(){cb(null,{done:true});},0);};',
    hung:
      '"use strict";module.exports.data=function(ctx,cb){console.log("provider-invoked");};'
  };

  let GetComponent;
  let mockedRepository;
  let retrievedSpy;
  let listenersActive;

  const makeComponentParams = ({ data, env = false }) => ({
    package: {
      name: 'timing-component',
      version: '1.0.0',
      oc: {
        container: false,
        renderInfo: false,
        files: {
          template: {
            type: 'jade',
            hashKey: '8c1fbd954f2b0d8cd5cf11c885fed4805225749f',
            src: 'template.js'
          },
          dataProvider: {
            type: 'node.js',
            hashKey: 'timing-provider-hash',
            src: 'server.js'
          },
          ...(env ? { env: '.env' } : {})
        }
      }
    },
    data,
    view: simpleView
  });

  const buildRepository = (params) => ({
    getCompiledView: sinon.stub().resolves(params.view),
    getComponent: sinon.stub().resolves(params.package),
    getEnv: params.package.oc.files.env
      ? sinon.stub().resolves({ secret: 'secretvalue' })
      : sinon.stub().rejects(new Error('no env')),
    getDataProvider: sinon
      .stub()
      .resolves({ content: params.data, filePath: '/path/to/server.js' }),
    getTemplatesInfo: sinon.stub().returns([
      { type: 'oc-template-jade', version: '6.0.1', externals: [] }
    ]),
    getTemplate: (type) =>
      type === 'jade' || type === 'oc-template-jade'
        ? require('oc-template-jade')
        : undefined,
    getStaticFilePath: sinon.stub().returns('//my-cdn.com/files/')
  });

  const initialise = (
    params,
    { local = false, realEventsHandler = false, trace = undefined } = {}
  ) => {
    const providerLogLabels = [];
    const sandboxConsole = {
      log: (...args) => {
        if (args[0] === 'provider-invoked') {
          providerLogLabels.push('provider-invoked');
          if (trace) {
            trace.push('provider-invoked');
          }
        }
      },
      error: noop,
      warn: noop,
      info: noop
    };
    retrievedSpy = sinon.spy();
    listenersActive = true;
    mockedRepository = buildRepository(params);

    const injections = {
      'oc-client': () => {
        const client = Client();
        return {
          renderTemplate: (template, data, renderOptions, cb) =>
            client.renderTemplate(template, data, renderOptions, cb)
        };
      }
    };

    if (!realEventsHandler) {
      injections['../../domain/events-handler'] = {
        on: noop,
        off: noop,
        fire: (eventName, eventData) => {
          if (trace) {
            trace.push(`event:${eventName}`);
          }
          if (eventName === 'component-retrieved') {
            retrievedSpy(eventName, eventData);
          }
        },
        hasListeners: () => listenersActive
      };
    }

    GetComponent = injectr(
      '../../dist/registry/routes/helpers/get-component.js',
      injections,
      { console: sandboxConsole, Buffer, clearTimeout, setTimeout, process }
    ).default;

    return { providerLogLabels };
  };

  const baseConf = (extra) => ({
    baseUrl: 'http://components.com/',
    ...extra
  });

  const baseOptions = (extra = {}) => ({
    name: 'timing-component',
    headers: {},
    parameters: {},
    version: '1.0.0',
    conf: baseConf(),
    ...extra
  });

  const renderVia = (getComponent, options) =>
    new Promise((resolve) => {
      getComponent(options, resolve);
    });

  const render = (options) => renderVia(GetComponent(baseConf(), mockedRepository), options);

  const retrievedEvents = () => retrievedSpy.getCalls();

  const completeOnce = async (options) => {
    let callback;
    await new Promise((resolve) => {
      callback = sinon.spy(resolve);
      GetComponent(
        baseConf(),
        mockedRepository
      )(options, callback);
    });
    return callback;
  };

  describe('callback ordering invariants', () => {
    it('returns from the renderer call before completion and preserves provider → event → callback order', async () => {
      const trace = [];
      const { providerLogLabels } = initialise(
        makeComponentParams({ data: PROVIDERS.tracedAsyncSuccess }),
        { local: true, trace }
      );
      const getComponent = GetComponent(baseConf({ local: true }), mockedRepository);

      const completion = new Promise((resolve) => {
        getComponent(
          baseOptions({ conf: baseConf({ local: true }) }),
          (result) => {
            trace.push(`callback:${result.status}`);
            resolve(result);
          }
        );
        trace.push('renderer-return');
        queueMicrotask(() => trace.push('microtask-sentinel'));
      });
      const result = await completion;

      expect(result.status).to.equal(200);
      expect(trace[0]).to.equal('renderer-return');
      expect(trace).to.include('microtask-sentinel');
      const indexOf = (label) => {
        const position = trace.indexOf(label);
        expect(position, `trace should contain ${label}`).to.be.at.least(0);
        return position;
      };
      expect(providerLogLabels).to.eql(['provider-invoked']);
      expect(indexOf('renderer-return')).to.be.below(indexOf('provider-invoked'));
      expect(indexOf('provider-invoked')).to.be.below(
        indexOf('event:component-retrieved')
      );
      expect(indexOf('event:component-retrieved')).to.be.below(
        indexOf('callback:200')
      );
      expect(retrievedEvents()).to.have.lengthOf(1);
    });

    it('does not look up env or invoke the provider before repository resolution completes', async () => {
      const params = makeComponentParams({
        data: PROVIDERS.syncSuccess,
        env: true
      });
      initialise(params);
      let resolveRepository;
      mockedRepository.getComponent = () =>
        new Promise((resolve) => {
          resolveRepository = resolve;
        });

      const options = baseOptions({
        parameters: {},
        headers: {}
      });
      const completion = render(options);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockedRepository.getEnv.callCount, 'env must wait').to.equal(0);
      expect(
        mockedRepository.getDataProvider.callCount,
        'provider must wait'
      ).to.equal(0);

      resolveRepository(params.package);
      const result = await completion;

      expect(result.status).to.equal(200);
      expect(mockedRepository.getEnv.callCount).to.equal(1);
      expect(mockedRepository.getDataProvider.callCount).to.equal(1);
    });

    it('invokes the provider only after env resolution completes', async () => {
      initialise(makeComponentParams({ data: PROVIDERS.syncSuccess, env: true }));

      const result = await render(baseOptions());

      expect(result.status).to.equal(200);
      expect(mockedRepository.getComponent.callCount).to.equal(1);
      expect(mockedRepository.getEnv.callCount).to.equal(1);
      expect(mockedRepository.getDataProvider.callCount).to.equal(1);
      sinon.assert.callOrder(
        mockedRepository.getComponent,
        mockedRepository.getEnv,
        mockedRepository.getDataProvider
      );
    });
  });

  describe('exact-once completion invariants', () => {
    it('produces exactly one error result when a provider throws synchronously', async () => {
      initialise(makeComponentParams({ data: PROVIDERS.syncThrow }));
      const callback = await completeOnce(baseOptions());

      expect(callback.callCount).to.equal(1);
      const result = callback.firstCall.args[0];
      expect(result.status).to.equal(500);
      expect(result.response.code).to.equal('GENERIC_ERROR');
      expect(result.response.details.originalError).to.be.an('error');
      expect(result.response.details.originalError.message).to.equal(
        'sync boom'
      );
      expect(retrievedEvents()).to.have.lengthOf(1);
      expect(retrievedEvents()[0].args[1].status).to.equal(500);
      sinon.assert.callOrder(retrievedSpy, callback);
    });

    it('produces exactly one result for an asynchronously succeeding provider', async () => {
      initialise(makeComponentParams({ data: PROVIDERS.asyncSuccess }));
      const callback = await completeOnce(baseOptions());

      expect(callback.callCount).to.equal(1);
      expect(callback.firstCall.args[0].status).to.equal(200);
      expect(callback.firstCall.args[0].response.html).to.not.equal(undefined);
      expect(retrievedEvents()).to.have.lengthOf(1);
    });

    it('produces exactly one error result for an asynchronously failing provider', async () => {
      initialise(makeComponentParams({ data: PROVIDERS.asyncErrorCallback }));
      const callback = await completeOnce(baseOptions());

      expect(callback.callCount).to.equal(1);
      const result = callback.firstCall.args[0];
      expect(result.status).to.equal(500);
      expect(result.response.details.originalError.message).to.equal(
        'async boom'
      );
      expect(retrievedEvents()).to.have.lengthOf(1);
      expect(retrievedEvents()[0].args[1].status).to.equal(500);
    });

    it('completes exactly once when a provider calls back twice', async () => {
      initialise(makeComponentParams({ data: PROVIDERS.doubleCallback }));
      const callback = await completeOnce(
        baseOptions({
          headers: { accept: 'application/vnd.oc.unrendered+json' }
        })
      );

      expect(callback.callCount).to.equal(1);
      expect(callback.firstCall.args[0].status).to.equal(200);
      expect(callback.firstCall.args[0].response.data).to.deep.equal({ n: 1 });
      expect(retrievedEvents()).to.have.lengthOf(1);
    });
  });

  describe('timeout invariants', () => {
    it('clears the timeout before dispatching the retrieval event and the public callback', async () => {
      const clock = sinon.useFakeTimers();
      try {
        initialise(makeComponentParams({ data: PROVIDERS.hung }));
        const getComponent = GetComponent(baseConf(), mockedRepository);
        let callback;

        const completion = new Promise((resolve) => {
          callback = sinon.spy(resolve);
          getComponent(
            baseOptions({ conf: baseConf({ executionTimeout: 1 }) }),
            callback
          );
        });

        for (
          let i = 0;
          i < 100 && clock.countTimers() === 0;
          i++
        ) {
          await Promise.resolve();
        }
        expect(
          clock.countTimers(),
          'execution timeout must be armed'
        ).to.be.above(0);
        clock.tick(1000);

        await completion;

        expect(callback.callCount).to.equal(1);
        const result = callback.firstCall.args[0];
        expect(result.status).to.equal(500);
        expect(result.response.error).to.contain('timeout');
        expect(clock.countTimers(), 'timeout must be cleared').to.equal(0);
        expect(retrievedEvents()).to.have.lengthOf(1);
        sinon.assert.callOrder(retrievedSpy, callback);
      } finally {
        clock.restore();
      }
    });
  });

  describe('retrieval event payload invariants', () => {
    it('fires component-retrieved exactly once with final fields immediately before the public callback on success', async () => {
      initialise(makeComponentParams({ data: PROVIDERS.syncSuccess }));
      let callback;

      await new Promise((resolve) => {
        callback = sinon.spy(resolve);
        GetComponent(
          baseConf(),
          mockedRepository
        )(
          baseOptions({
            headers: { 'accept-language': 'en-GB' },
            parameters: { a: '1' },
            version: '2.3.4'
          }),
          callback
        );
      });

      const events = retrievedEvents();
      expect(events).to.have.lengthOf(1);
      const eventData = events[0].args[1];
      expect(Object.keys(eventData).sort()).to.eql([
        'duration',
        'headers',
        'href',
        'name',
        'parameters',
        'renderMode',
        'requestVersion',
        'status',
        'version'
      ]);
      expect(eventData.headers).to.eql({ 'accept-language': 'en-GB' });
      expect(eventData.name).to.equal('timing-component');
      expect(eventData.parameters).to.eql({ a: '1' });
      expect(eventData.requestVersion).to.equal('2.3.4');
      expect(eventData.href).to.equal(
        'http://components.com/timing-component/2.3.4?a=1'
      );
      expect(eventData.version).to.equal('1.0.0');
      expect(eventData.renderMode).to.equal('rendered');
      expect(eventData.status).to.equal(200);
      expect(eventData.duration).to.be.above(0);
      expect(retrievedSpy.lastCall.callId).to.equal(
        callback.firstCall.callId - 1
      );
    });

    it('preserves response fields in the component-retrieved payload for errors', async () => {
      initialise(makeComponentParams({ data: PROVIDERS.asyncErrorCallback }));
      const callback = await completeOnce(baseOptions());

      expect(callback.callCount).to.equal(1);
      const events = retrievedEvents();
      expect(events).to.have.lengthOf(1);
      const eventData = events[0].args[1];
      expect(Object.keys(eventData).sort()).to.eql([
        'code',
        'details',
        'duration',
        'error',
        'headers',
        'href',
        'name',
        'parameters',
        'renderMode',
        'requestVersion',
        'status',
        'version'
      ]);
      expect(eventData.code).to.equal('GENERIC_ERROR');
      expect(eventData.error).to.be.a('string');
      expect(eventData.status).to.equal(500);
      expect(eventData.duration).to.be.above(0);
    });
  });

  describe('local diagnostics invariants', () => {
    it('finishes stack enrichment before the retrieval event and the public callback', async () => {
      initialise(
        makeComponentParams({ data: PROVIDERS.syncErrorCallback }),
        { local: true }
      );

      const result = await render(baseOptions({ conf: baseConf({ local: true }) }));

      expect(result.status).to.equal(500);
      expect(mockedRepository.getDataProvider.callCount).to.equal(2);
      expect(retrievedEvents()).to.have.lengthOf(1);
      sinon.assert.callOrder(mockedRepository.getDataProvider, retrievedSpy);
    });

    it('falls back to the original stack when enrichment fails', async () => {
      initialise(
        makeComponentParams({ data: PROVIDERS.syncErrorCallback }),
        { local: true }
      );
      mockedRepository.getDataProvider = sinon
        .stub()
        .onFirstCall()
        .resolves({
          content: PROVIDERS.syncErrorCallback,
          filePath: '/path/to/server.js'
        })
        .onSecondCall()
        .rejects(new Error('storage down'));

      let callback;
      await new Promise((resolve) => {
        callback = sinon.spy(resolve);
        GetComponent(
          baseConf({ local: true }),
          mockedRepository
        )(baseOptions({ conf: baseConf({ local: true }) }), callback);
      });

      expect(callback.callCount).to.equal(1);
      const result = callback.firstCall.args[0];
      expect(result.status).to.equal(500);
      expect(result.response.details.originalError.message).to.equal('boom');
      expect(result.response.details.stack).to.equal(
        result.response.details.originalError.stack
      );
    });
  });

  describe('warm env cache invariants', () => {
    it('serves consecutive renders without a second repository env lookup', async () => {
      const envParams = makeComponentParams({
        data: '"use strict";module.exports.data=function(ctx,cb){cb(null,{mySecret:ctx.env.secret});};',
        env: true
      });
      initialise(envParams);
      const getComponent = GetComponent(baseConf(), mockedRepository);
      const options = baseOptions({
        headers: { accept: 'application/vnd.oc.unrendered+json' }
      });

      const first = await renderVia(getComponent, options);
      const second = await renderVia(getComponent, options);

      expect(first.status).to.equal(200);
      expect(second.status).to.equal(200);
      expect(first.response.data).to.deep.equal({ mySecret: 'secretvalue' });
      expect(second.response.data).to.deep.equal({ mySecret: 'secretvalue' });
      expect(mockedRepository.getEnv.callCount).to.equal(1);
      expect(retrievedEvents()).to.have.lengthOf(2);
    });
  });

  describe('dynamic listener semantics with the real events handler', () => {
    const eventsHandler =
      require('../../dist/registry/domain/events-handler').default;
    let listener;
    let pendingResolution;

    const setupRealHandler = (params) => {
      initialise(params, { realEventsHandler: true });
      mockedRepository.getComponent = () => pendingResolution.promise;
    };

    beforeEach(() => {
      eventsHandler.reset();
      pendingResolution = {};
      pendingResolution.promise = new Promise((resolve) => {
        pendingResolution.resolve = resolve;
      });
      listener = sinon.spy();
    });

    afterEach(() => {
      eventsHandler.reset();
    });

    it('delivers the completion event to a listener added mid-flight', async () => {
      const params = makeComponentParams({ data: PROVIDERS.syncSuccess });
      setupRealHandler(params);

      const completion = render(baseOptions());
      eventsHandler.on('component-retrieved', listener);
      pendingResolution.resolve(params.package);

      const result = await completion;

      expect(result.status).to.equal(200);
      expect(listener.callCount).to.equal(1);
      const eventData = listener.firstCall.args[0];
      expect(eventData.name).to.equal('timing-component');
      expect(eventData.status).to.equal(200);
      expect(eventData.duration).to.be.above(0);
    });

    it('does not deliver the completion event to a listener removed mid-flight', async () => {
      const params = makeComponentParams({ data: PROVIDERS.syncSuccess });
      setupRealHandler(params);
      eventsHandler.on('component-retrieved', listener);

      const completion = render(baseOptions());
      eventsHandler.off('component-retrieved', listener);
      pendingResolution.resolve(params.package);

      const result = await completion;

      expect(result.status).to.equal(200);
      expect(listener.callCount).to.equal(0);
    });
  });
});
