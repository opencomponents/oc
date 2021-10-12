'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const injectr = require('injectr');

describe('registry : routes : plugins', () => {
  const dependencyMap = {
    fs: {
      core: true,
      name: 'fs',
      link: 'http://link1.com'
    },
    got: {
      name: 'got',
      version: '1.2.3',
      core: false,
      link: 'http://link2.com'
    }
  };
  let resJsonStub, statusStub, dependenciesRoute;

  const DependenciesRoute = injectr(
    '../../dist/registry/routes/dependencies.js',
    {
      './helpers/get-available-dependencies': list =>
        list.map(dep => dependencyMap[dep])
    }
  ).default;

  const initialise = function () {
    resJsonStub = sinon.stub();
    statusStub = sinon.stub().returns({ json: resJsonStub });
  };

  describe('when is not discoverable', () => {
    before(() => {
      initialise();
      const conf = {
        dependencies: ['fs', 'got'],
        discovery: false
      };
      dependenciesRoute = DependenciesRoute(conf);

      dependenciesRoute({ headers: {} }, { conf, status: statusStub });
    });

    it('should return 401 status code', () => {
      expect(statusStub.args[0][0]).to.be.equal(401);
    });
  });

  describe('when is discoverable', () => {
    before(() => {
      initialise();
      const conf = {
        dependencies: ['fs', 'got'],
        discovery: true
      };
      dependenciesRoute = DependenciesRoute(conf);

      dependenciesRoute({ headers: {} }, { conf, status: statusStub });
    });

    it('should return the list of dependencies', () => {
      expect(resJsonStub.args[0][0]).to.eql([
        { name: 'fs', core: true },
        { name: 'got', core: false, versions: ['1.2.3'] }
      ]);
    });
  });
});
