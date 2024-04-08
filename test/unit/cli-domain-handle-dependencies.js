const coreModules = require('builtin-modules');
const expect = require('chai').expect;
const injectr = require('injectr');
const sinon = require('sinon');

describe('cli : domain : handle-dependencies', () => {
  describe('happy path', () => {
    const components = {
      '/path/to/components/handlebars-legacy': {
        name: 'handlebars-legacy',
        oc: { files: { template: { type: 'handlebars' } } },
        dependencies: { lodash: '1.2.3' }
      },
      '/path/to/components/handlebars': {
        name: 'handlebars',
        oc: { files: { template: { type: 'oc-template-handlebars' } } },
        devDependencies: { 'oc-template-handlebars-compiler': '1.x.x' }
      },
      '/path/to/components/jade-legacy': {
        name: 'jade-legacy',
        oc: { files: { template: { type: 'jade' } } },
        dependencies: { moment: '2.x.x' }
      },
      '/path/to/components/jade': {
        name: 'jade',
        oc: { files: { template: { type: 'oc-template-jade' } } },
        devDependencies: { 'oc-template-jade-compiler': '1.x.x' }
      },
      '/path/to/components/react': {
        name: 'react',
        oc: { files: { template: { type: 'oc-template-react' } } },
        devDependencies: { 'oc-template-react-compiler': 'x.x.x' }
      }
    };

    let logger;
    let spies;
    let error;
    let result;
    beforeEach((done) => {
      spies = {
        ensureCompilerIsDeclaredAsDevDependency: sinon.spy(),
        getCompiler: sinon.spy(),
        installMissingDependencies: sinon.spy()
      };

      const handleDependencies = injectr(
        '../../dist/cli/domain/handle-dependencies/index.js',
        {
          'fs-extra': {
            readJson: (path) =>
              Promise.resolve(components[path.replace('/package.json', '')])
          },
          'node:path': { join: (...args) => args.join('/') },
          './ensure-compiler-is-declared-as-devDependency': (options) => {
            spies.ensureCompilerIsDeclaredAsDevDependency(options);
            return `${options.template}-compiler`;
          },
          './get-compiler': (options) => {
            spies.getCompiler(options);
            return Promise.resolve({ thisIsACompiler: true });
          },
          './install-missing-dependencies': (options) => {
            spies.installMissingDependencies(options);
            return Promise.resolve();
          }
        }
      ).default;

      logger = {
        fail: sinon.spy(),
        ok: sinon.spy(),
        warn: sinon.spy()
      };

      handleDependencies({ components: Object.keys(components), logger })
        .then((res) => (result = res))
        .catch((err) => (error = err))
        .finally(done);
    });

    it('should return no error', () => {
      expect(error).to.be.undefined;
    });

    it('should return modules plus the node.js core modules', () => {
      expect(result.modules).to.deep.equal(
        [...coreModules, ...['lodash', 'moment']].sort()
      );
    });

    it('should return templates', () => {
      expect(result.templates.length).to.equal(3);
      expect(result.templates).to.deep.equal([
        { thisIsACompiler: true },
        { thisIsACompiler: true },
        { thisIsACompiler: true }
      ]);
    });

    it('should log progress', () => {
      expect(logger.warn.args[0][0]).to.equal(
        'Ensuring dependencies are loaded...'
      );
    });

    it('should make sure compilers are declared as devDependencies', () => {
      const args = spies.ensureCompilerIsDeclaredAsDevDependency.args;
      expect(args.length).to.equal(3);
      expect(args[0][0].pkg).to.deep.equal(
        components['/path/to/components/handlebars']
      );
      expect(args[1][0].pkg).to.deep.equal(
        components['/path/to/components/jade']
      );
      expect(args[2][0].pkg).to.deep.equal(
        components['/path/to/components/react']
      );
    });

    it('should fetch the compilers', () => {
      const args = spies.getCompiler.args;
      expect(args.length).to.equal(3);
      expect(args[0][0].compilerDep).to.equal(
        'oc-template-handlebars-compiler'
      );
      expect(args[1][0].compilerDep).to.equal('oc-template-jade-compiler');
      expect(args[2][0].compilerDep).to.equal('oc-template-react-compiler');
    });

    it('should install the dependencies if missing', () => {
      const args = spies.installMissingDependencies.args;
      expect(args[0][0].dependencies).to.deep.equal({
        lodash: '1.2.3',
        moment: '2.x.x'
      });
    });
  });
});
