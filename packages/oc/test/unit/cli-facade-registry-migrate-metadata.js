const { expect } = require('chai');
const fs = require('fs-extra');
const path = require('node:path');
const sinon = require('sinon');

const RegistryMigrateMetadata = require('../../dist/cli/facade/registry-migrate-metadata').default;

const configPath = path.join(
  __dirname,
  '../fixtures/metadata-migration-config.js'
);
const esmConfigPath = path.join(
  __dirname,
  '../fixtures/metadata-migration-config.mjs'
);

const execute = (facade, options) =>
  new Promise((resolve, reject) => {
    facade(options, (err, result) => (err ? reject(err) : resolve(result)));
  });

describe('cli : facade : registry : migrate-metadata', () => {
  let logger;
  let metadataStore;
  let cdn;

  before(() => {
    fs.writeFileSync(
      configPath,
      'module.exports = global.__ocMetadataMigrationConfig;'
    );
    fs.writeFileSync(
      esmConfigPath,
      'export default global.__ocMetadataMigrationConfig;'
    );
  });

  after(() => {
    fs.removeSync(configPath);
    fs.removeSync(esmConfigPath);
    delete global.__ocMetadataMigrationConfig;
  });

  beforeEach(() => {
    logger = {
      err: sinon.stub(),
      log: sinon.stub(),
      ok: sinon.stub(),
      warn: sinon.stub()
    };
    metadataStore = {
      adapterType: 'test-metadata',
      isValid: sinon.stub().returns(true),
      initialise: sinon.stub().resolves(),
      addVersion: sinon.stub().resolves(),
      close: sinon.stub().resolves()
    };
    cdn = {
      adapterType: 'test-storage',
      getFile: sinon.stub().resolves(''),
      getJson: sinon.stub().resolves({
        lastEdit: 123,
        components: {
          'hello-world': {
            '1.0.0': { publishDate: 123, templateSize: 10 }
          }
        }
      }),
      listSubDirectories: sinon.stub(),
      maxConcurrentRequests: 2
    };
    global.__ocMetadataMigrationConfig = {
      baseUrl: 'http://localhost:3000/',
      compileClient: false,
      storage: {
        adapter: () => cdn,
        options: {
          componentsDir: 'components',
          path: 'http://cdn.example.com/'
        }
      },
      metadata: {
        adapter: () => metadataStore,
        options: {}
      }
    };
  });

  it('should backfill metadata from the configured registry storage', async () => {
    const registryMigrateMetadata = RegistryMigrateMetadata({ logger });

    const result = await execute(registryMigrateMetadata, { configPath });

    expect(result).to.eql({ scanned: 1, inserted: 1, skipped: 0 });
    expect(metadataStore.initialise.calledOnce).to.be.true;
    expect(cdn.getJson.calledOnceWith('components/components-details.json', true))
      .to.be.true;
    expect(metadataStore.addVersion.args[0][0]).to.eql({
      name: 'hello-world',
      version: '1.0.0',
      publishDate: 123,
      templateSize: 10
    });
    expect(logger.ok.args[0][0]).to.equal(
      'Metadata migration completed: 1 scanned, 1 inserted, 0 skipped'
    );
    expect(metadataStore.close.calledOnce).to.be.true;
  });

  it('should load native ESM registry config modules', async () => {
    const registryMigrateMetadata = RegistryMigrateMetadata({ logger });

    const result = await execute(registryMigrateMetadata, {
      configPath: esmConfigPath
    });

    expect(result).to.eql({ scanned: 1, inserted: 1, skipped: 0 });
    expect(metadataStore.initialise.calledOnce).to.be.true;
  });

  it('should pass top-level manageSchema to the configured metadata adapter', async () => {
    const adapter = sinon.stub().returns(metadataStore);
    global.__ocMetadataMigrationConfig.metadata = {
      adapter,
      options: { connectionString: 'sql' },
      manageSchema: false
    };
    const registryMigrateMetadata = RegistryMigrateMetadata({ logger });

    await execute(registryMigrateMetadata, { configPath });

    expect(adapter.args[0][0]).to.eql({
      connectionString: 'sql',
      manageSchema: false
    });
  });

  it('should scan storage directories when components-details.json is missing', async () => {
    cdn.getJson.reset();
    cdn.getJson
      .withArgs('components/components-details.json', true)
      .rejects({ code: 'file_not_found' });
    cdn.getJson
      .withArgs('components/hello-world/1.0.0/package.json', true)
      .resolves({ oc: { date: 123, files: { template: { size: 10 } } } });
    cdn.listSubDirectories.withArgs('components').resolves(['hello-world']);
    cdn.listSubDirectories.withArgs('components/hello-world').resolves(['1.0.0']);
    const registryMigrateMetadata = RegistryMigrateMetadata({ logger });

    const result = await execute(registryMigrateMetadata, { configPath });

    expect(result).to.eql({ scanned: 1, inserted: 1, skipped: 0 });
    expect(cdn.listSubDirectories.calledWith('components')).to.be.true;
    expect(metadataStore.addVersion.args[0][0]).to.eql({
      name: 'hello-world',
      version: '1.0.0',
      publishDate: 123,
      templateSize: 10
    });
    expect(metadataStore.close.calledOnce).to.be.true;
  });

  it('should close the metadata store even when backfill fails', async () => {
    metadataStore.initialise = sinon.stub().rejects(new Error('db down'));
    const registryMigrateMetadata = RegistryMigrateMetadata({ logger });
    let error;

    try {
      await execute(registryMigrateMetadata, { configPath });
    } catch (err) {
      error = err;
    }

    expect(error.message).to.equal('db down');
    expect(metadataStore.close.calledOnce).to.be.true;
  });

  it('should fail when metadata config is missing', async () => {
    delete global.__ocMetadataMigrationConfig.metadata;
    const registryMigrateMetadata = RegistryMigrateMetadata({ logger });
    let error;

    try {
      await execute(registryMigrateMetadata, { configPath });
    } catch (err) {
      error = err;
    }

    expect(error.message).to.equal('Registry config must include metadata options');
    expect(logger.err.args[0][0]).to.equal(
      'Registry config must include metadata options'
    );
  });
});
