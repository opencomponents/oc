const { expect } = require('chai');
const sql = require('mssql');

const createAdapter = require('../dist/index.js').default;
const { VERSION_ALREADY_EXISTS } = require('../dist/index.js');

const connectionString = process.env.OC_METADATA_SQL_CONNECTION_STRING;

const describeIntegration = connectionString ? describe : describe.skip;

const uniqueSuffix = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const dropTable = async (pool, schemaName, tableName) => {
  await pool
    .request()
    .query(
      `IF OBJECT_ID(N'${schemaName}.${tableName}', N'U') IS NOT NULL DROP TABLE [${schemaName}].[${tableName}];`
    );
};

describeIntegration('oc-azure-sql-metadata-adapter : integration', () => {
  let pool;
  const schemaName = 'dbo';
  const managedTableName = `oc_components_it_${uniqueSuffix()}`;
  const customTableName = `oc_components_it_${uniqueSuffix()}`;
  const createdTables = [managedTableName, customTableName];

  before(async () => {
    pool = await new sql.ConnectionPool(connectionString).connect();
    for (const tableName of createdTables) {
      await dropTable(pool, schemaName, tableName);
    }
  });

  after(async () => {
    if (pool) {
      for (const tableName of createdTables) {
        await dropTable(pool, schemaName, tableName);
      }
      await pool.close();
    }
  });

  describe('managed schema', () => {
    let store;

    afterEach(async () => {
      if (store?.close) {
        await store.close();
      }
      await dropTable(pool, schemaName, managedTableName);
    });

    it('should create the expected table and index', async () => {
      store = createAdapter({
        connectionString,
        tableName: managedTableName
      });

      await store.initialise();

      const table = await pool
        .request()
        .input('tableName', sql.NVarChar(255), managedTableName)
        .input('schemaName', sql.NVarChar(255), schemaName)
        .query(
          `SELECT name FROM sys.tables WHERE name = @tableName AND schema_id = SCHEMA_ID(@schemaName);`
        )
        .then((r) => r.recordset[0]);
      expect(table, 'table should exist').to.exist;

      const index = await pool
        .request()
        .input('objectName', sql.NVarChar(255), managedTableName)
        .input('schemaName', sql.NVarChar(255), schemaName)
        .query(
          `SELECT name FROM sys.indexes WHERE object_id = OBJECT_ID(@schemaName + '.' + @objectName) AND name = 'ix_oc_components_name';`
        )
        .then((r) => r.recordset[0]);
      expect(index, 'name index should exist').to.exist;
    });

    it('should verify the schema when manageSchema is false after the table exists', async () => {
      store = createAdapter({
        connectionString,
        tableName: managedTableName
      });
      await store.initialise();
      await store.close();

      store = createAdapter({
        connectionString,
        tableName: managedTableName,
        manageSchema: false
      });
      await store.initialise();
    });

    it('should fail manageSchema:false when the table is missing', async () => {
      const missingTable = `oc_components_missing_${uniqueSuffix()}`;
      store = createAdapter({
        connectionString,
        tableName: missingTable,
        manageSchema: false
      });

      let error;
      try {
        await store.initialise();
      } catch (err) {
        error = err;
      }

      expect(error).to.exist;
      await dropTable(pool, schemaName, missingTable);
    });
  });

  describe('addVersion() and getAllComponents()', () => {
    let store;

    beforeEach(async () => {
      await dropTable(pool, schemaName, managedTableName);
      store = createAdapter({
        connectionString,
        tableName: managedTableName
      });
      await store.initialise();
    });

    afterEach(async () => {
      if (store?.close) {
        await store.close();
      }
      await dropTable(pool, schemaName, managedTableName);
    });

    it('should insert rows and return mapped component rows', async () => {
      await store.addVersion({
        name: 'hello-world',
        version: '1.0.0',
        publishDate: 123,
        templateSize: 456
      });
      await store.addVersion({
        name: 'hello-world',
        version: '1.0.1',
        publishDate: 124
      });

      const rows = await store.getAllComponents();

      expect(rows).to.have.length(2);
      const sorted = rows.sort((a, b) =>
        a.version === b.version ? 0 : a.version < b.version ? -1 : 1
      );
      expect(sorted[0]).to.eql({
        name: 'hello-world',
        version: '1.0.0',
        publishDate: 123,
        templateSize: 456
      });
      expect(sorted[1]).to.eql({
        name: 'hello-world',
        version: '1.0.1',
        publishDate: 124
      });
    });

    it('should map a duplicate insert to VERSION_ALREADY_EXISTS', async () => {
      await store.addVersion({
        name: 'hello-world',
        version: '1.0.0',
        publishDate: 123
      });

      let error;
      try {
        await store.addVersion({
          name: 'hello-world',
          version: '1.0.0',
          publishDate: 125
        });
      } catch (err) {
        error = err;
      }

      expect(error).to.exist;
      expect(error.code).to.equal(VERSION_ALREADY_EXISTS);

      const rows = await store.getAllComponents();
      expect(rows).to.have.length(1);
      expect(rows[0].publishDate).to.equal(123);
    });

    it('should allow different components without contention', async () => {
      await Promise.all([
        store.addVersion({
          name: 'component-a',
          version: '1.0.0',
          publishDate: 123
        }),
        store.addVersion({
          name: 'component-b',
          version: '1.0.0',
          publishDate: 124
        })
      ]);

      const rows = await store.getAllComponents();
      expect(rows).to.have.length(2);
    });
  });

  describe('custom schema and table name', () => {
    let store;

    afterEach(async () => {
      if (store?.close) {
        await store.close();
      }
      await dropTable(pool, schemaName, customTableName);
    });

    it('should create and use a customised table name', async () => {
      store = createAdapter({
        connectionString,
        tableName: customTableName
      });

      await store.initialise();
      await store.addVersion({
        name: 'custom-component',
        version: '1.0.0',
        publishDate: 42,
        templateSize: 7
      });

      const rows = await store.getAllComponents();
      expect(rows).to.eql([
        {
          name: 'custom-component',
          version: '1.0.0',
          publishDate: 42,
          templateSize: 7
        }
      ]);

      const direct = await pool
        .request()
        .input('tableName', sql.NVarChar(255), customTableName)
        .query(
          `SELECT COUNT(*) AS n FROM [${schemaName}].[${customTableName}];`
        )
        .then((r) => r.recordset[0].n);
      expect(direct).to.equal(1);
    });
  });

  describe('close()', () => {
    it('should close the pool and allow a fresh store to connect afterwards', async () => {
      const tableName = `oc_components_close_${uniqueSuffix()}`;
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
      expect(rows).to.have.length(1);
      await store2.close();

      await dropTable(pool, schemaName, tableName);
    });
  });
});
