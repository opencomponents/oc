const { expect } = require('chai');
const sinon = require('sinon');

const {
  backfillMetadataFromComponentsDetails,
  backfillMetadataFromStorageDetails,
  backfillMetadataRows,
  exportLegacyMetadataFiles,
  getComponentRowsFromComponentsDetails,
  getComponentRowsFromStorageDirectories
} = require('../../dist/registry/domain/metadata-migration');

const componentsDetails = {
  lastEdit: 123,
  components: {
    'hello-world': {
      '1.0.0': { publishDate: 123, templateSize: 10 },
      '1.0.1': { publishDate: 124 }
    },
    welcome: {
      '2.0.0': { publishDate: 125, templateSize: 20 }
    }
  }
};

describe('registry : domain : metadata-migration', () => {
  describe('getComponentRowsFromComponentsDetails()', () => {
    it('should map components-details.json content to metadata rows', () => {
      expect(getComponentRowsFromComponentsDetails(componentsDetails)).to.eql([
        {
          name: 'hello-world',
          version: '1.0.0',
          publishDate: 123,
          templateSize: 10
        },
        { name: 'hello-world', version: '1.0.1', publishDate: 124 },
        { name: 'welcome', version: '2.0.0', publishDate: 125, templateSize: 20 }
      ]);
    });
  });

  describe('backfillMetadataRows()', () => {
    it('should insert rows into the metadata store', async () => {
      const metadataStore = { addVersion: sinon.stub().resolves() };

      const result = await backfillMetadataRows(metadataStore, [
        { name: 'hello-world', version: '1.0.0', publishDate: 123 },
        { name: 'welcome', version: '2.0.0', publishDate: 125 }
      ]);

      expect(result).to.eql({ scanned: 2, inserted: 2, skipped: 0 });
      expect(metadataStore.addVersion.args.map((args) => args[0])).to.eql([
        { name: 'hello-world', version: '1.0.0', publishDate: 123 },
        { name: 'welcome', version: '2.0.0', publishDate: 125 }
      ]);
    });

    it('should treat existing metadata rows as skipped', async () => {
      const metadataStore = {
        addVersion: sinon
          .stub()
          .onFirstCall()
          .resolves()
          .onSecondCall()
          .rejects({ code: 'VERSION_ALREADY_EXISTS' })
      };

      const result = await backfillMetadataRows(metadataStore, [
        { name: 'hello-world', version: '1.0.0', publishDate: 123 },
        { name: 'hello-world', version: '1.0.1', publishDate: 124 }
      ]);

      expect(result).to.eql({ scanned: 2, inserted: 1, skipped: 1 });
    });

    it('should insert rows concurrently with a bounded limit', async () => {
      let active = 0;
      let maxActive = 0;
      const metadataStore = {
        addVersion: sinon.stub().callsFake(
          () =>
            new Promise((resolve) => {
              active += 1;
              maxActive = Math.max(maxActive, active);
              setTimeout(() => {
                active -= 1;
                resolve();
              }, 1);
            })
        )
      };
      const rows = Array.from({ length: 25 }, (_, index) => ({
        name: 'hello-world',
        version: `1.0.${index}`,
        publishDate: 123 + index
      }));

      const result = await backfillMetadataRows(metadataStore, rows);

      expect(result).to.eql({ scanned: 25, inserted: 25, skipped: 0 });
      expect(maxActive).to.equal(10);
    });

    it('should treat active metadata reservations as skipped', async () => {
      const metadataStore = {
        addVersion: sinon.stub().rejects({ code: 'VERSION_PUBLISH_IN_PROGRESS' })
      };

      const result = await backfillMetadataRows(metadataStore, [
        { name: 'hello-world', version: '1.0.0', publishDate: 123 }
      ]);

      expect(result).to.eql({ scanned: 1, inserted: 0, skipped: 1 });
    });

    it('should rethrow non-idempotent metadata insert errors', async () => {
      const error = new Error('database unavailable');
      const metadataStore = { addVersion: sinon.stub().rejects(error) };
      let thrown;

      try {
        await backfillMetadataRows(metadataStore, [
          { name: 'hello-world', version: '1.0.0', publishDate: 123 }
        ]);
      } catch (err) {
        thrown = err;
      }

      expect(thrown).to.equal(error);
    });
  });

  describe('backfillMetadataFromComponentsDetails()', () => {
    it('should backfill rows from components details', async () => {
      const metadataStore = { addVersion: sinon.stub().resolves() };

      const result = await backfillMetadataFromComponentsDetails(
        metadataStore,
        componentsDetails
      );

      expect(result).to.eql({ scanned: 3, inserted: 3, skipped: 0 });
    });
  });

  describe('exportLegacyMetadataFiles()', () => {
    it('should export metadata rows to legacy components files', async () => {
      const metadataStore = {
        getAllComponents: sinon.stub().resolves([
          {
            name: 'hello-world',
            version: '1.0.0',
            publishDate: 123,
            templateSize: 10
          },
          { name: 'hello-world', version: '1.0.1', publishDate: 124 }
        ])
      };
      const cdn = { putFileContent: sinon.stub().resolves() };

      const result = await exportLegacyMetadataFiles({
        metadataStore,
        cdn,
        componentsDir: 'components'
      });

      expect(result).to.eql({
        exported: 2,
        files: ['components/components.json', 'components/components-details.json']
      });
      expect(cdn.putFileContent.args).to.have.length(2);
      expect(cdn.putFileContent.args[0][1]).to.equal('components/components.json');
      expect(JSON.parse(cdn.putFileContent.args[0][0]).components).to.eql({
        'hello-world': ['1.0.0', '1.0.1']
      });
      expect(cdn.putFileContent.args[1][1]).to.equal(
        'components/components-details.json'
      );
      expect(JSON.parse(cdn.putFileContent.args[1][0]).components).to.eql({
        'hello-world': {
          '1.0.0': { publishDate: 123, templateSize: 10 },
          '1.0.1': { publishDate: 124 }
        }
      });
    });
  });

  describe('getComponentRowsFromStorageDirectories()', () => {
    it('should map component package.json files from storage directories to metadata rows', async () => {
      const cdn = {
        listSubDirectories: sinon.stub(),
        getJson: sinon.stub(),
        maxConcurrentRequests: 2
      };
      cdn.listSubDirectories.withArgs('components').resolves(['hello-world', 'welcome']);
      cdn.listSubDirectories
        .withArgs('components/hello-world')
        .resolves(['1.0.0', '1.0.1']);
      cdn.listSubDirectories.withArgs('components/welcome').resolves(['2.0.0']);
      cdn.getJson
        .withArgs('components/hello-world/1.0.0/package.json', true)
        .resolves({ oc: { date: 123, files: { template: { size: 10 } } } });
      cdn.getJson
        .withArgs('components/hello-world/1.0.1/package.json', true)
        .rejects({ code: 'file_not_found' });
      cdn.getJson
        .withArgs('components/welcome/2.0.0/package.json', true)
        .resolves({ oc: { date: 125, files: { template: { size: 20 } } } });

      const rows = await getComponentRowsFromStorageDirectories({
        cdn,
        componentsDir: 'components'
      });

      expect(rows).to.eql([
        {
          name: 'hello-world',
          version: '1.0.0',
          publishDate: 123,
          templateSize: 10
        },
        { name: 'welcome', version: '2.0.0', publishDate: 125, templateSize: 20 }
      ]);
    });

    it('should return no rows when the components directory does not exist', async () => {
      const cdn = {
        listSubDirectories: sinon.stub().rejects({ code: 'dir_not_found' }),
        maxConcurrentRequests: 2
      };

      const rows = await getComponentRowsFromStorageDirectories({
        cdn,
        componentsDir: 'components'
      });

      expect(rows).to.eql([]);
    });
  });

  describe('backfillMetadataFromStorageDetails()', () => {
    it('should read components-details.json from storage and backfill rows', async () => {
      const metadataStore = { addVersion: sinon.stub().resolves() };
      const cdn = { getJson: sinon.stub().resolves(componentsDetails) };

      const result = await backfillMetadataFromStorageDetails({
        metadataStore,
        cdn,
        componentsDir: 'components'
      });

      expect(cdn.getJson.calledOnceWith('components/components-details.json', true))
        .to.be.true;
      expect(result).to.eql({ scanned: 3, inserted: 3, skipped: 0 });
    });

    it('should scan storage directories when components-details.json is missing', async () => {
      const metadataStore = { addVersion: sinon.stub().resolves() };
      const cdn = {
        listSubDirectories: sinon.stub(),
        getJson: sinon.stub(),
        maxConcurrentRequests: 2
      };
      cdn.getJson
        .withArgs('components/components-details.json', true)
        .rejects({ code: 'file_not_found' });
      cdn.listSubDirectories.withArgs('components').resolves(['hello-world']);
      cdn.listSubDirectories.withArgs('components/hello-world').resolves(['1.0.0']);
      cdn.getJson
        .withArgs('components/hello-world/1.0.0/package.json', true)
        .resolves({ oc: { date: 123, files: { template: { size: 10 } } } });

      const result = await backfillMetadataFromStorageDetails({
        metadataStore,
        cdn,
        componentsDir: 'components'
      });

      expect(result).to.eql({ scanned: 1, inserted: 1, skipped: 0 });
      expect(metadataStore.addVersion.args[0][0]).to.eql({
        name: 'hello-world',
        version: '1.0.0',
        publishDate: 123,
        templateSize: 10
      });
    });
  });
});
