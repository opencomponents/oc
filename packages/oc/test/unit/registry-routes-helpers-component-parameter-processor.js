const expect = require('chai').expect;
const sinon = require('sinon');
const injectr = require('injectr');

describe('registry : routes : helpers : component-parameter-processor', () => {
  const applyDefaultValues =
    require('../../dist/registry/routes/helpers/apply-default-values').default;
  const sanitiser = require('../../dist/registry/domain/sanitiser');
  const validator =
    require('../../dist/registry/domain/validators').validateComponentParameters;
  const processor = require('../../dist/registry/routes/helpers/component-parameter-processor');
  const { compileParameterSchema, processParameters } = processor;

  const originalPipeline = (reqParams, expected) => {
    const applied = applyDefaultValues(reqParams, expected);
    const sanitised = sanitiser.sanitiseComponentParameters(applied, expected);
    const validation = validator(sanitised, expected);
    return { params: sanitised, validation };
  };

  const newPipeline = (reqParams, expected) => {
    const compiled = compileParameterSchema(expected);
    return processParameters(reqParams, compiled);
  };

  describe('parity with original three-stage pipeline', () => {
    const cases = [
      {
        name: 'empty/undefined schema with no request parameters',
        req: undefined,
        exp: undefined
      },
      {
        name: 'empty schema with no request parameters',
        req: {},
        exp: {}
      },
      {
        name: 'empty schema with ordinary undeclared parameters',
        req: { age: 123, foo: 'bar' },
        exp: {}
      },
      {
        name: 'removal of __ocAcceptLanguage from provider params',
        req: { foo: 'bar', __ocAcceptLanguage: 'en-US' },
        exp: {}
      },
      {
        name: 'optional defaults for string',
        req: {},
        exp: {
          opt: { type: 'string', mandatory: false, default: 'def' }
        }
      },
      {
        name: 'optional defaults for false',
        req: {},
        exp: {
          opt: { type: 'boolean', mandatory: false, default: false }
        }
      },
      {
        name: 'optional defaults for zero',
        req: {},
        exp: {
          opt: { type: 'number', mandatory: false, default: 0 }
        }
      },
      {
        name: 'optional defaults for empty string',
        req: {},
        exp: {
          opt: { type: 'string', mandatory: false, default: '' }
        }
      },
      {
        name: 'explicit request values overriding defaults',
        req: { opt: 'custom' },
        exp: {
          opt: { type: 'string', mandatory: false, default: 'def' },
          opt2: { type: 'boolean', mandatory: false, default: false }
        }
      },
      {
        name: 'missing mandatory parameters and exact error text/order',
        req: {},
        exp: { userId: { type: 'string', mandatory: true } }
      },
      {
        name: 'string/number/boolean coercion',
        req: { a: 'true', b: '123', c: null },
        exp: {
          a: { type: 'boolean', mandatory: false },
          b: { type: 'number', mandatory: false },
          c: { type: 'string', mandatory: false }
        }
      },
      {
        name: 'invalid type',
        req: { flag: 123 },
        exp: { flag: { type: 'boolean', mandatory: true } }
      },
      {
        name: 'invalid enum values',
        req: { status: 'invalid' },
        exp: {
          status: {
            type: 'string',
            mandatory: true,
            enum: ['active', 'inactive']
          }
        }
      },
      {
        name: 'multiple missing/invalid parameters and exact joined message',
        req: { flag: 123 },
        exp: {
          name: { type: 'string', mandatory: true },
          flag: { type: 'boolean', mandatory: false },
          status: {
            type: 'string',
            mandatory: true,
            enum: ['active', 'inactive']
          }
        }
      },
      {
        name: 'defaults with null should be replaced',
        req: { opt: null },
        exp: {
          opt: { type: 'string', mandatory: false, default: 'def' }
        }
      },
      {
        name: 'defaults with undefined should be replaced',
        req: { opt: undefined },
        exp: {
          opt: { type: 'string', mandatory: false, default: 'def' }
        }
      },
      {
        name: 'number coercion of string numeric',
        req: { age: '123' },
        exp: { age: { type: 'number', mandatory: true } }
      },
      {
        name: 'boolean coercion true',
        req: { flag: 'true' },
        exp: { flag: { type: 'boolean', mandatory: true } }
      },
      {
        name: 'boolean coercion false',
        req: { flag: 'false' },
        exp: { flag: { type: 'boolean', mandatory: true } }
      },
      {
        name: 'string null becomes empty string',
        req: { myString: null },
        exp: { myString: { type: 'string', mandatory: false } }
      },
      {
        name: 'mandatory missing order preserved',
        req: {},
        exp: {
          z: { type: 'string', mandatory: true },
          a: { type: 'string', mandatory: true },
          m: { type: 'string', mandatory: true }
        }
      },
      {
        name: 'type errors order preserved',
        req: { a: 123, b: 123, c: 123 },
        exp: {
          a: { type: 'string', mandatory: false },
          b: { type: 'string', mandatory: false },
          c: { type: 'string', mandatory: false }
        }
      },
      {
        name: 'combined mandatory and type errors message',
        req: { flag: 123 },
        exp: {
          name: { type: 'string', mandatory: true },
          flag: { type: 'boolean', mandatory: false }
        }
      }
    ];

    for (const { name, req, exp } of cases) {
      it(`should match original for: ${name}`, () => {
        const cloneReqForOrig = (() => {
          if (req === undefined) return undefined;
          if (req === null) return null;
          const c = {};
          for (const k in req) {
            if (Object.prototype.hasOwnProperty.call(req, k)) c[k] = req[k];
          }
          return c;
        })();
        const cloneExpForOrig = (() => {
          if (exp === undefined) return undefined;
          if (exp === null) return null;
          const c = {};
          for (const k in exp) {
            if (Object.prototype.hasOwnProperty.call(exp, k)) c[k] = { ...exp[k] };
          }
          return c;
        })();
        const cloneReqForNew = (() => {
          if (req === undefined) return undefined;
          if (req === null) return null;
          const c = {};
          for (const k in req) {
            if (Object.prototype.hasOwnProperty.call(req, k)) c[k] = req[k];
          }
          return c;
        })();
        const cloneExpForNew = (() => {
          if (exp === undefined) return undefined;
          if (exp === null) return null;
          const c = {};
          for (const k in exp) {
            if (Object.prototype.hasOwnProperty.call(exp, k)) c[k] = { ...exp[k] };
          }
          return c;
        })();

        const orig = originalPipeline(cloneReqForOrig, cloneExpForOrig);
        const nw = newPipeline(cloneReqForNew, cloneExpForNew);
        expect(nw.params).to.eql(orig.params);
        expect(nw.validation).to.eql(orig.validation);
      });
    }

    it('should preserve mutation behavior: applying defaults mutates original request object', () => {
      const expected = {
        opt: { type: 'string', mandatory: false, default: 'def' },
        opt2: { type: 'boolean', mandatory: false, default: false }
      };
      const reqOrig = { mandatory: 'x' };
      const reqNew = { mandatory: 'x' };
      const compiled = compileParameterSchema(expected);
      // original mutates
      applyDefaultValues(reqOrig, expected);
      processParameters(reqNew, compiled);
      expect(reqOrig).to.eql(reqNew);
      expect(reqOrig).to.have.property('opt', 'def');
      expect(reqOrig).to.have.property('opt2', false);
    });

    it('should preserve distinct object: sanitized params are a distinct object from input', () => {
      const expected = { a: { type: 'string', mandatory: false } };
      const req = { a: 'hello', b: 'world' };
      const compiled = compileParameterSchema(expected);
      const { params } = processParameters(req, compiled);
      expect(params).to.not.equal(req);
      expect(params).to.eql({ a: 'hello', b: 'world' });
    });

    it('should keep __ocAcceptLanguage available to language selection (original not mutated for that key)', () => {
      const expected = {};
      const req = { foo: 'bar', __ocAcceptLanguage: 'fr' };
      const compiled = compileParameterSchema(expected);
      const { params } = processParameters(req, compiled);
      expect(params).to.not.have.property('__ocAcceptLanguage');
      expect(req).to.have.property('__ocAcceptLanguage', 'fr');
    });

    it('should preserve __ocAcceptLanguage when it is a declared parameter', () => {
      const expected = {
        __ocAcceptLanguage: { type: 'string', mandatory: false }
      };
      const req = { __ocAcceptLanguage: 'en', foo: 'bar' };
      const compiled = compileParameterSchema(expected);
      const { params } = processParameters(req, compiled);
      expect(params).to.have.property('__ocAcceptLanguage', 'en');
    });
  });

  describe('schema compilation', () => {
    it('should compile empty/missing schemas to shared singleton', () => {
      const c1 = compileParameterSchema(undefined);
      const c2 = compileParameterSchema(null);
      const c3 = compileParameterSchema({});
      const c4 = compileParameterSchema({} );
      expect(c1).to.equal(c2);
      expect(c1).to.equal(c3);
      expect(c1).to.equal(c4);
      expect(c1.isEmpty).to.be.true;
    });

    it('should compile non-empty schema with ordered defaults/mandatory/types', () => {
      const expected = {
        b: { type: 'string', mandatory: false, default: 'x' },
        a: { type: 'number', mandatory: true },
        c: { type: 'boolean', mandatory: false, default: true }
      };
      const compiled = compileParameterSchema(expected);
      expect(compiled.isEmpty).to.be.false;
      expect(compiled.defaults).to.eql([
        ['b', 'x'],
        ['c', true]
      ]);
      expect(compiled.mandatory).to.eql(['a']);
      expect(compiled.types).to.have.property('b', 'string');
      expect(compiled.types).to.have.property('a', 'number');
      expect(compiled.types).to.have.property('c', 'boolean');
    });

    it('should normalize type names during compilation', () => {
      const expected = {
        p: { type: 'String', mandatory: false },
        q: { type: 'NUMBER', mandatory: false },
        r: { type: 'BoOlEaN', mandatory: false }
      };
      const compiled = compileParameterSchema(expected);
      expect(compiled.types.p).to.equal('string');
      expect(compiled.types.q).to.equal('number');
      expect(compiled.types.r).to.equal('boolean');
    });

    it('should not capture request data in compiled object', () => {
      const expected = {
        a: { type: 'string', mandatory: false, default: 'def' }
      };
      const compiled = compileParameterSchema(expected);
      const req = { a: 'requestValue', b: 'extra' };
      processParameters(req, compiled);
      // compiled should only contain config-derived data
      expect(compiled.defaults).to.eql([['a', 'def']]);
      expect(JSON.stringify(compiled)).to.not.include('requestValue');
      expect(JSON.stringify(compiled)).to.not.include('extra');
    });
  });

  describe('empty-schema fast lane', () => {
    it('should skip defaults/mandatory/type/enum and preserve undeclared params', () => {
      const compiled = compileParameterSchema({});
      const req = { foo: 'bar', num: 123, __ocAcceptLanguage: 'fr' };
      const { params, validation } = processParameters(req, compiled);
      expect(params).to.eql({ foo: 'bar', num: 123 });
      expect(validation.isValid).to.be.true;
      expect(validation.errors.message).to.equal('');
    });

    it('should produce distinct objects for empty schema', () => {
      const compiled = compileParameterSchema({});
      const req = { a: 1 };
      const r1 = processParameters({ ...req }, compiled);
      const r2 = processParameters({ ...req }, compiled);
      expect(r1.params).to.not.equal(r2.params);
      expect(r1.validation).to.not.equal(r2.validation);
      expect(r1.validation.errors).to.not.equal(r2.validation.errors);
    });
  });

  describe('output and error objects are not shared between requests', () => {
    it('should return fresh params and errors each call', () => {
      const expected = {
        name: { type: 'string', mandatory: true },
        flag: { type: 'boolean', mandatory: false }
      };
      const compiled = compileParameterSchema(expected);
      const r1 = processParameters({ flag: 123 }, compiled);
      const r2 = processParameters({ flag: 123 }, compiled);
      expect(r1.params).to.not.equal(r2.params);
      expect(r1.validation).to.not.equal(r2.validation);
      expect(r1.validation.errors).to.not.equal(r2.validation.errors);
      expect(r1.validation.errors.mandatory).to.not.equal(r2.validation.errors.mandatory);
      expect(r1.validation.errors.types).to.not.equal(r2.validation.errors.types);
      // mutating first should not affect second
      r1.params.flag = 'mutated';
      r1.validation.errors.types.extra = 'x';
      expect(r2.params.flag).to.equal(123);
      expect(r2.validation.errors.types).to.not.have.property('extra');
    });

    it('should return fresh objects for valid case as well', () => {
      const expected = {
        opt: { type: 'string', mandatory: false, default: 'def' }
      };
      const compiled = compileParameterSchema(expected);
      const r1 = processParameters({}, compiled);
      const r2 = processParameters({}, compiled);
      expect(r1.params).to.not.equal(r2.params);
      expect(r1.validation.errors).to.not.equal(r2.validation.errors);
      r1.params.opt = 'mutated';
      expect(r2.params.opt).to.equal('def');
    });
  });

  describe('hot-reload schema identity', () => {
    it('should produce new defaults/validation immediately for new schema identity', () => {
      const schemaV1 = {
        opt: { type: 'string', mandatory: false, default: 'v1' }
      };
      const schemaV2 = {
        opt: { type: 'string', mandatory: false, default: 'v2' },
        extra: { type: 'string', mandatory: true }
      };
      const c1 = compileParameterSchema(schemaV1);
      const c2 = compileParameterSchema(schemaV2);
      expect(c1).to.not.equal(c2);
      const r1 = processParameters({}, c1);
      expect(r1.params).to.eql({ opt: 'v1' });
      expect(r1.validation.isValid).to.be.true;
      const r2 = processParameters({}, c2);
      expect(r2.params).to.eql({ opt: 'v2' });
      expect(r2.validation.isValid).to.be.false;
      expect(r2.validation.errors.mandatory).to.have.property('extra');
    });
  });

  describe('compilation caching via get-component WeakMap', () => {
    const getProcessorPath = '../../dist/registry/routes/helpers/component-parameter-processor';
    const getComponentPath = '../../dist/registry/routes/helpers/get-component.js';

    it('should compile same schema object once across repeated renders', (done) => {
      const processor = require(getProcessorPath);
      const spy = sinon.spy(processor, 'compileParameterSchema');

      const GetComponent = injectr(
        getComponentPath,
        {
          '../../domain/events-handler': {
            on: () => {},
            fire: () => {},
            hasListeners: () => false
          }
        },
        { console, Buffer, clearTimeout, setTimeout, process }
      ).default;

      const schema = {
        name: { type: 'string', mandatory: true },
        opt: { type: 'string', mandatory: false, default: 'def' }
      };

      const component = {
        name: 'test-comp',
        version: '1.0.0',
        oc: {
          container: false,
          renderInfo: false,
          files: {
            template: {
              type: 'jade',
              hashKey: 'hash',
              src: 'template.js'
            }
          },
          parameters: schema
        }
      };

      const mockedRepository = {
        getComponent: sinon.stub().resolves(component),
        getEnv: sinon.stub().rejects(),
        getDataProvider: sinon.stub().resolves({ content: 'module.exports.data=function(c,cb){cb(null,{})}', filePath: '/tmp/server.js' }),
        getCompiledView: sinon.stub().resolves('oc.components["hash"]=function(){return""}'),
        getTemplatesInfo: () => [],
        getTemplate: () => ({ getCompiledTemplate: (s) => () => s }),
        getStaticFilePath: () => '//cdn/'
      };

      const getComponent = GetComponent({ baseUrl: 'http://components.com/', templates: [], plugins: {}, env: {} }, mockedRepository);

      let count = 0;
      const checkDone = () => {
        count++;
        if (count === 2) {
          try {
            // compile should have been called once for this schema identity
            // It may have been called once for empty singleton at init plus once for schema
            // So filter calls where first arg is schema
            const callsForSchema = spy
              .getCalls()
              .filter((c) => c.args[0] === schema);
            expect(callsForSchema.length).to.equal(1);
            spy.restore();
            done();
          } catch (e) {
            spy.restore();
            done(e);
          }
        }
      };

      getComponent(
        { name: 'test-comp', headers: {}, parameters: {}, version: '1.0.0', conf: { baseUrl: 'http://components.com/' } },
        () => checkDone()
      );
      // second render with same schema identity
      setTimeout(() => {
        getComponent(
          { name: 'test-comp', headers: {}, parameters: {}, version: '1.0.0', conf: { baseUrl: 'http://components.com/' } },
          () => checkDone()
        );
      }, 20);
    });

    it('should compile different schema identities independently', (done) => {
      const processor = require(getProcessorPath);
      const spy = sinon.spy(processor, 'compileParameterSchema');

      const GetComponent = injectr(
        getComponentPath,
        {
          '../../domain/events-handler': {
            on: () => {},
            fire: () => {},
            hasListeners: () => false
          }
        },
        { console, Buffer, clearTimeout, setTimeout, process }
      ).default;

      const schema1 = {
        a: { type: 'string', mandatory: true }
      };
      const schema2 = {
        b: { type: 'string', mandatory: true }
      };

      const comp1 = {
        name: 'comp1',
        version: '1.0.0',
        oc: {
          container: false,
          renderInfo: false,
          files: { template: { type: 'jade', hashKey: 'h1', src: 't.js' } },
          parameters: schema1
        }
      };
      const comp2 = {
        name: 'comp2',
        version: '1.0.0',
        oc: {
          container: false,
          renderInfo: false,
          files: { template: { type: 'jade', hashKey: 'h2', src: 't.js' } },
          parameters: schema2
        }
      };

      const mockedRepository = {
        getComponent: (name) => {
          if (name === 'comp1') return Promise.resolve(comp1);
          return Promise.resolve(comp2);
        },
        getEnv: sinon.stub().rejects(),
        getDataProvider: sinon.stub().resolves({ content: 'module.exports.data=function(c,cb){cb(null,{})}', filePath: '/tmp/server.js' }),
        getCompiledView: sinon.stub().resolves('oc.components["h1"]=function(){return""}'),
        getTemplatesInfo: () => [],
        getTemplate: () => ({ getCompiledTemplate: (s) => () => s }),
        getStaticFilePath: () => '//cdn/'
      };

      const getComponent = GetComponent({ baseUrl: 'http://components.com/', templates: [], plugins: {}, env: {} }, mockedRepository);

      let doneCount = 0;
      const maybeDone = () => {
        doneCount++;
        if (doneCount === 2) {
          try {
            const c1Calls = spy.getCalls().filter((c) => c.args[0] === schema1);
            const c2Calls = spy.getCalls().filter((c) => c.args[0] === schema2);
            expect(c1Calls.length).to.equal(1);
            expect(c2Calls.length).to.equal(1);
            spy.restore();
            done();
          } catch (e) {
            spy.restore();
            done(e);
          }
        }
      };

      getComponent({ name: 'comp1', headers: {}, parameters: {}, version: '1.0.0', conf: { baseUrl: 'http://components.com/' } }, maybeDone);
      setTimeout(() => {
        getComponent({ name: 'comp2', headers: {}, parameters: {}, version: '1.0.0', conf: { baseUrl: 'http://components.com/' } }, maybeDone);
      }, 20);
    });
  });

  describe('enum behavior preservation', () => {
    it('should use strict equality (includes) for enum checks', () => {
      const expected = {
        num: { type: 'number', mandatory: false, enum: [1, 2, 3] }
      };
      const compiled = compileParameterSchema(expected);
      const r1 = processParameters({ num: '1' }, compiled); // '1' string -> Number('1')=1 => should be valid
      expect(r1.validation.isValid).to.be.true;
      const r2 = processParameters({ num: 5 }, compiled);
      expect(r2.validation.isValid).to.be.false;
      expect(r2.validation.errors.types.num).to.include('1, 2, 3');
    });
  });
});
