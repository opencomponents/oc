const expect = require('chai').expect;
const injectr = require('injectr');
const sinon = require('sinon');

const initialise = () => {
  const deprecate = sinon.stub();
  const sanitise = injectr(
    '../../dist/registry/domain/options-sanitiser.js',
    {
      '../../utils/deprecate': { __esModule: true, default: deprecate }
    },
    { process, console }
  ).default;

  return { sanitise, deprecate };
};

describe('registry : domain : options-sanitiser : deprecations', () => {
  describe('when the legacy "s3" shortcut is provided', () => {
    it('emits a deprecation notice pointing to storage.adapter/storage.options', () => {
      const { sanitise, deprecate } = initialise();

      sanitise({ s3: { some: 'data' }, baseUrl: 'dummy' });

      expect(deprecate.calledOnce).to.be.true;
      expect(deprecate.args[0][0]).to.include({
        id: 'registry-config-s3'
      });
    });
  });

  describe('when "refreshInterval" is provided alongside storage', () => {
    it('emits a deprecation notice pointing to pollingInterval', () => {
      const { sanitise, deprecate } = initialise();

      sanitise({
        refreshInterval: 666,
        storage: { options: {} },
        baseUrl: 'dummy'
      });

      expect(deprecate.calledOnce).to.be.true;
      expect(deprecate.args[0][0]).to.include({
        id: 'registry-config-refreshInterval'
      });
    });

    it('emits a deprecation notice even when the value is falsy', () => {
      const { sanitise, deprecate } = initialise();

      sanitise({
        refreshInterval: 0,
        storage: {},
        baseUrl: 'dummy'
      });

      expect(deprecate.calledOnce).to.be.true;
      expect(deprecate.args[0][0]).to.include({
        id: 'registry-config-refreshInterval'
      });
    });

    it('forwards the value into storage.options, initialising it if missing', () => {
      const { sanitise, deprecate } = initialise();

      const options = sanitise({
        refreshInterval: 0,
        storage: {},
        baseUrl: 'dummy'
      });

      expect(options.storage.options.refreshInterval).to.equal(0);
    });
  });

  describe('when "discovery" is a boolean', () => {
    it('emits a deprecation notice pointing to the object form', () => {
      const { sanitise, deprecate } = initialise();

      sanitise({ discovery: true, baseUrl: 'dummy' });

      expect(deprecate.calledOnce).to.be.true;
      expect(deprecate.args[0][0]).to.include({
        id: 'registry-config-discovery-boolean'
      });
    });
  });

  describe('when "discovery" is already an object', () => {
    it('does not emit a deprecation notice', () => {
      const { sanitise, deprecate } = initialise();

      sanitise({ discovery: { ui: true }, baseUrl: 'dummy' });

      expect(deprecate.called).to.be.false;
    });
  });

  describe('when none of the deprecated options are used', () => {
    it('does not emit any deprecation notice', () => {
      const { sanitise, deprecate } = initialise();

      sanitise({ baseUrl: 'dummy' });

      expect(deprecate.called).to.be.false;
    });
  });
});
