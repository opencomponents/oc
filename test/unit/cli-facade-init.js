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

  const logSpy = {},
    InitFacade = require('../../dist/cli/facade/init'),
    Local = injectr('../../dist/cli/domain/local.js', deps, {}),
    local = Local({ logger: { log: () => {} } }),
    initFacade = InitFacade({ local: local, logger: logSpy });

  const execute = function(componentPath, templateType) {
    logSpy.err = sinon.spy();
    logSpy.ok = sinon.spy();
    logSpy.log = sinon.spy();
    initFacade(
      { componentPath: componentPath, templateType: templateType },
      () => {}
    );
  };

  describe('when initialising a new component', () => {
    describe('when the component is an empty string', () => {
      beforeEach(() => {
        execute(' ');
      });

      it('should show an error', () => {
        const expected =
          'An error happened when initialising the component: the name is not valid. Allowed characters are alphanumeric, _, -';
        expect(logSpy.err.args[0][0]).to.equal(expected);
      });
    });

    describe('when the component has a non valid name', () => {
      beforeEach(() => {
        execute('hello-asd$qwe:11', 'handlebars');
      });

      it('should show an error', () => {
        const expected =
          'An error happened when initialising the component: the name is not valid. Allowed characters are alphanumeric, _, -';
        expect(logSpy.err.args[0][0]).to.equal(expected);
      });
    });

    describe('when the template is of a non valid type', () => {
      beforeEach(() => {
        execute('valid-component', 'invalid-type');
      });

      it('should show an error', () => {
        const expected =
          'An error happened when initialising the component: Error requiring oc-template: "invalid-type" is not a valid oc-template';
        expect(logSpy.err.args[0][0]).to.equal(expected);
      });
    });

    describe('when an error happens', () => {
      beforeEach(() => {
        sinon.stub(local, 'init').yields('nope!');
        execute('the-best-component', 'handlebars');
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
      beforeEach(() => {
        sinon.stub(local, 'init').yields(null, 'yes man');
        execute('this/is/relative/path/to/the-best-component', 'jade');
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
      beforeEach(() => {
        sinon.stub(local, 'init').yields(null, 'yes man');
        execute('the-best-component', 'jade');
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
