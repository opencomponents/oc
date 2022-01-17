'use strict';

const path = require('path');
const expect = require('chai').expect;
const sinon = require('sinon');
const injectr = require('injectr');

describe('cli : facade : init', () => {
  const deps = {
    './init-template': () => {
      throw '💩';
    }
  };

  const logSpy = {};
  const InitFacade = require('../../dist/cli/facade/init').default;
  const Local = injectr('../../dist/cli/domain/local.js', deps, {}).default;
  const local = Local({ logger: { log: () => {} } });
  const initFacade = InitFacade({ local: local, logger: logSpy });

  const execute = function (componentPath, templateType, done) {
    logSpy.err = sinon.spy();
    logSpy.ok = sinon.spy();
    logSpy.log = sinon.spy();
    initFacade(
      { componentPath: componentPath, templateType: templateType },
      () => {
        done();
      }
    );
  };

  describe('when initialising a new component', () => {
    describe('when the component is an empty string', () => {
      beforeEach(done => {
        execute(' ', undefined, done);
      });

      it('should show an error', () => {
        const expected =
          'An error happened when initialising the component: the name is not valid. Allowed characters are alphanumeric, _, -';
        expect(logSpy.err.args[0][0]).to.equal(expected);
      });
    });

    describe('when the component has a non valid name', () => {
      beforeEach(done => {
        execute('hello-asd$qwe:11', 'handlebars', done);
      });

      it('should show an error', () => {
        const expected =
          'An error happened when initialising the component: the name is not valid. Allowed characters are alphanumeric, _, -';
        expect(logSpy.err.args[0][0]).to.equal(expected);
      });
    });

    describe('when the template is of a non valid type', () => {
      beforeEach(done => {
        execute('valid-component', 'invalid-type', done);
      });

      it('should show an error', () => {
        const expected =
          'An error happened when initialising the component: Error requiring oc-template: "invalid-type" is not a valid oc-template';
        expect(logSpy.err.args[0][0]).to.equal(expected);
      });
    });

    describe('when an error happens', () => {
      beforeEach(done => {
        sinon.stub(local, 'init').rejects('nope!');
        execute('the-best-component', 'handlebars', done);
      });

      afterEach(() => {
        local.init.restore();
      });

      it('should show an error', () => {
        expect(logSpy.err.args[0][0]).to.equal(
          'An error happened when initialising the component: nope!'
        );
      });
    });

    describe('when the component has relative path', () => {
      beforeEach(done => {
        sinon.stub(local, 'init').resolves('yes man');
        execute('this/is/relative/path/to/the-best-component', 'jade', done);
      });

      afterEach(() => {
        local.init.restore();
      });

      it('should show a correct name in the log message', () => {
        expect(logSpy.log.args[0][0]).to.contain(
          'Success! Created the-best-component at'
        );
      });

      it('should show a correct path in the log message', () => {
        expect(logSpy.log.args[0][0]).to.contain(
          path.join('/this/is/relative/path/to/the-best-component')
        );
      });
    });

    describe('when succeeds', () => {
      beforeEach(done => {
        sinon.stub(local, 'init').resolves('yes man');
        execute('the-best-component', 'jade', done);
      });

      afterEach(() => {
        local.init.restore();
      });

      it('should show a message', () => {
        expect(logSpy.log.args[0][0]).to.contain(
          'Success! Created the-best-component at'
        );
      });
    });
  });
});
