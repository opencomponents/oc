const expect = require('chai').expect;
const sinon = require('sinon');

describe('registry : routes : plugins', () => {
  const PluginsRoute = require('../../dist/registry/routes/plugins').default;
  let resJsonStub;
  let statusStub;
  let pluginsRoute;
  let plugins;

  const initialise = () => {
    resJsonStub = sinon.stub();
    statusStub = sinon.stub().returns({ json: resJsonStub });
    plugins = {
      plugin1: {
        handler: () => {},
        description: 'Description plugin 1'
      },
      plugin2: {
        handler: () => {},
        description: ''
      }
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
        discovery: { ui: true }
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
