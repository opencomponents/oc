const expect = require('chai').expect;
const injectr = require('injectr');
const sinon = require('sinon');

describe('cli : domain : package-components', () => {
  const initialise = (componentName) => {
    const component = {
      name: componentName || 'helloworld',
      oc: {
        files: {
          static: ['css'],
          template: {
            type: 'jade',
            src: 'template.jade'
          }
        }
      },
      dependencies: {}
    };

    const fsMock = {
      existsSync: sinon.stub(),
      mkdir: sinon.stub().resolves(),
      rm: sinon.stub().resolves(),
      readFile: sinon.stub(),
      readdirSync: sinon.stub().returns(['template.js']),
      statSync: sinon.stub().returns({ size: 300 }),
      writeFileSync: sinon.stub().returns({})
    };

    fsMock.existsSync.returns(true);
    fsMock.readFile.onCall(0).resolves(JSON.stringify(component));
    fsMock.readFile.onCall(1).resolves(JSON.stringify({ version: '1.2.3' }));

    const pathMock = {
      join: () => ''
    };

    const requireTemplateMock = () => ({
      compile: (options, callback) => {
        if (options.componentPath === '.') {
          callback(null, { oc: { files: { template: {} } } });
          // callback(null, 'ok');
        }
        if (options.componentPath === '') {
          callback(new Error('Ouch'));
        }
      }
    });

    const PackageComponents = injectr(
      '../../dist/cli/domain/package-components.js',
      {
        'node:fs': fsMock,
        'node:fs/promises': fsMock,
        path: pathMock,
        './handle-dependencies/require-template': requireTemplateMock
      },
      { __dirname: '' }
    ).default;

    return PackageComponents;
  };

  describe('when packaging', () => {
    describe('when component is valid', () => {
      const PackageComponents = initialise();
      it('should add sizes and correctly invoke the callback when template succeed packaging', (done) => {
        let info;
        PackageComponents()({
          componentPath: '.',
          minify: true
        })
          .then((res) => {
            info = res;
          })
          .finally(() => {
            expect(info).to.deep.equal({
              oc: { files: { template: { size: 300 } } }
            });
            done();
          });
      });
    });

    describe('when component parameters are not valid', () => {
      const PackageComponents = initialise();
      it('should add version to package.json file', (done) => {
        let error;
        PackageComponents()({
          componentPath: '',
          minify: true
        })
          .catch((err) => {
            error = err;
          })
          .finally(() => {
            expect(error?.message).to.equal('Ouch');
            done();
          });
      });
    });

    describe('when component name is not valid', () => {
      const PackageComponents = initialise('h@lloworld');
      it('should add version to package.json file', (done) => {
        let error;
        PackageComponents()({
          componentPath: '.',
          minify: true
        })
          .catch((err) => {
            error = err;
          })
          .finally(() => {
            expect(error.message).to.equal('name not valid');
            done();
          });
      });
    });
  });
});
