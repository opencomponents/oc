'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');

describe('registry : routes : plugins', () => {
  const PluginsRoute = require('../../src/registry/routes/plugins');
  let resJsonStub, statusStub, pluginsRoute, plugins;

  const initialise = function() {
    resJsonStub = sinon.stub();
    statusStub = sinon.stub().returns({ json: resJsonStub });
    const plugin1 = () => {};
    plugin1.toString = () => 'Description plugin 1';
    const plugin2 = () => {};
    plugin2.toString = () => '';
    plugins = {
      plugin1,
      plugin2
    };
  };

  describe('when is not discoverable', () => {
    before(() => {
      initialise();
      const conf = {
        plugins,
        discovery: false
      };
      pluginsRoute = PluginsRoute(conf);

      pluginsRoute({ headers: {} }, { conf, status: statusStub });
    });

    it('should return 401 status code', () => {
      expect(statusStub.args[0][0]).to.be.equal(401);
    });
  });

  describe('when is discoverable', () => {
    before(() => {
      initialise();
      const conf = {
        plugins,
        discovery: true
      };
      pluginsRoute = PluginsRoute(conf);

      pluginsRoute({ headers: {} }, { conf, status: statusStub });
    });

    it('should return the list of plugins', () => {
      expect(resJsonStub.args[0][0]).to.eql([
        { name: 'plugin1', description: 'Description plugin 1' },
        { name: 'plugin2', description: '' }
      ]);
    });
  });
});
