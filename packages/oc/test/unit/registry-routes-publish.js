const fs = require('fs-extra');
const os = require('node:os');
const path = require('node:path');
const expect = require('chai').expect;
const injectr = require('injectr');
const sinon = require('sinon');

describe('registry : routes : publish', () => {
  describe('when publish finishes', () => {
    let packagePath;
    let packageUntarOutput;
    let tempDir;
    let pkgDetails;
    let publishRoute;
    let repository;
    let statusStub;

    beforeEach(async () => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-publish-'));
      packagePath = path.join(tempDir, '1478279453422.tar.gz');
      packageUntarOutput = path.join(tempDir, '1478279453422');
      fs.writeFileSync(packagePath, 'package');
      fs.ensureDirSync(packageUntarOutput);
      fs.writeFileSync(path.join(packageUntarOutput, 'kept-outside.txt'), 'file');

      pkgDetails = {
        outputFolder: path.join(packageUntarOutput, '_package'),
        packageJson: {
          oc: {
            files: {
              template: {}
            }
          }
        },
        packagePath,
        packageUntarOutput
      };
      repository = {
        publishComponent: sinon.stub().resolves()
      };
      statusStub = sinon.stub().returns({ json: sinon.stub() });

      publishRoute = injectr(
        '../../dist/registry/routes/publish.js',
        {
          '../domain/extract-package': {
            __esModule: true,
            default: sinon.stub().resolves(pkgDetails)
          },
          '../domain/validators': {
            validatePackage: sinon.stub().returns({
              isValid: true,
              files: [{ path: packagePath }]
            }),
            validateOcCliVersion: sinon.stub().returns({ isValid: true }),
            validateNodeVersion: sinon.stub().returns({ isValid: true }),
            validateTemplateOcVersion: sinon.stub().returns({ isValid: true })
          }
        },
        { process }
      ).default(repository);

      await publishRoute(
        {
          files: [{ path: packagePath }],
          headers: {},
          params: {
            componentName: 'hello-world',
            componentVersion: '1.0.0'
          },
          query: {}
        },
        {
          conf: {
            tarExtractMode: 766
          },
          status: statusStub
        }
      );
    });

    afterEach(() => {
      fs.removeSync(tempDir);
    });

    it('should remove only the uploaded package and extracted package folder', () => {
      expect(fs.existsSync(packagePath)).to.be.false;
      expect(fs.existsSync(packageUntarOutput)).to.be.false;
    });
  });
});
