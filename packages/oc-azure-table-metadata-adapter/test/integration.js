const { expect } = require('chai');
const { TableClient, TableServiceClient } = require('@azure/data-tables');

const createAdapter = require('../dist/index.js').default;
const { VERSION_ALREADY_EXISTS } = require('../dist/index.js');

const connectionString = process.env.OC_METADATA_TABLE_CONNECTION_STRING;

const describeIntegration = connectionString ? describe : describe.skip;

const uniqueSuffix = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const cleanTable = async (tableName) => {
  const client = TableClient.fromConnectionString(connectionString, tableName);
  const toDelete = [];
  for await (const entity of client.listEntities()) {
    toDelete.push(entity);
  }
  await Promise.all(
    toDelete.map((e) => client.deleteEntity(e.partitionKey, e.rowKey))
  );
};

const deleteTable = async (tableName) => {
  const serviceClient =
    TableServiceClient.fromConnectionString(connectionString);
  try {
    await serviceClient.deleteTable(tableName);
  } catch {
    // ignore if table doesn't exist
  }
};

describeIntegration('oc-azure-table-metadata-adapter : integration', () => {
  const tableName = `ocit${uniqueSuffix()}`;
  const customTableName = `ocit${uniqueSuffix()}`;

  after(async () => {
    await deleteTable(tableName);
    await deleteTable(customTableName);
  });

  describe('managed schema', () => {
    let store;

    afterEach(async () => {
      if (store) {
        await store.close();
      }
    });

    it('should create the table and allow insert/query', async () => {
      store = createAdapter({
        connectionString,
        tableName
      });

      await store.initialise();

      await store.addVersion({
        name: 'test-component',
        version: '1.0.0',
        publishDate: 123,
        templateSize: 456
      });

      const rows = await store.getAllComponents();
      expect(rows).to.have.length(1);
      expect(rows[0]).to.eql({
        name: 'test-component',
        version: '1.0.0',
        publishDate: 123,
        templateSize: 456
      });
    });

    it('should be idempotent — initialise twice does not throw', async () => {
      store = createAdapter({
        connectionString,
        tableName
      });

      await store.initialise();
      await store.initialise();
    });
  });

  describe('addVersion() and getAllComponents()', () => {
    let store;

    before(async () => {
      store = createAdapter({
        connectionString,
        tableName
      });
      await store.initialise();
      await cleanTable(tableName);
    });

    after(async () => {
      await store.close();
    });

    it('should insert rows and return mapped component rows', async () => {
      await store.addVersion({
        name: 'comp-a',
        version: '1.0.0',
        publishDate: 100,
        templateSize: 10
      });
      await store.addVersion({
        name: 'comp-a',
        version: '1.0.1',
        publishDate: 200
      });
      await store.addVersion({
        name: 'comp-b',
        version: '1.0.0',
        publishDate: 300,
        templateSize: 20
      });

      const rows = await store.getAllComponents();
      expect(rows).to.have.length(3);
    });

    it('should map a duplicate insert to VERSION_ALREADY_EXISTS', async () => {
      await store.addVersion({
        name: 'dup-test',
        version: '1.0.0',
        publishDate: 123
      });

      let error;
      try {
        await store.addVersion({
          name: 'dup-test',
          version: '1.0.0',
          publishDate: 999
        });
      } catch (err) {
        error = err;
      }

      expect(error).to.exist;
      expect(error.code).to.equal(VERSION_ALREADY_EXISTS);
    });

    it('should allow different components without contention', async () => {
      await Promise.all([
        store.addVersion({
          name: 'concurrent-a',
          version: '1.0.0',
          publishDate: 1
        }),
        store.addVersion({
          name: 'concurrent-b',
          version: '1.0.0',
          publishDate: 2
        })
      ]);

      const rows = await store.getAllComponents();
      const names = rows.map((r) => r.name);
      expect(names).to.include('concurrent-a');
      expect(names).to.include('concurrent-b');
    });
  });

  describe('custom table name', () => {
    let store;

    after(async () => {
      if (store) {
        await store.close();
      }
    });

    it('should create and use a customised table name', async () => {
      store = createAdapter({
        connectionString,
        tableName: customTableName
      });

      await store.initialise();
      await store.addVersion({
        name: 'custom-comp',
        version: '1.0.0',
        publishDate: 42,
        templateSize: 7
      });

      const rows = await store.getAllComponents();
      expect(rows).to.eql([
        {
          name: 'custom-comp',
          version: '1.0.0',
          publishDate: 42,
          templateSize: 7
        }
      ]);
    });
  });

  describe('close()', () => {
    it('should allow a fresh store to connect after close', async () => {
      const store = createAdapter({
        connectionString,
        tableName
      });

      await store.initialise();
      await store.addVersion({
        name: 'close-test',
        version: '1.0.0',
        publishDate: 1
      });
      await store.close();

      const store2 = createAdapter({
        connectionString,
        tableName
      });
      await store2.initialise();
      const rows = await store2.getAllComponents();
      const closeTest = rows.find(
        (r) => r.name === 'close-test' && r.version === '1.0.0'
      );
      expect(closeTest).to.exist;
      await store2.close();
    });
  });
});
