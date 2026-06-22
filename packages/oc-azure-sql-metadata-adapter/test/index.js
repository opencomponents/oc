const { expect } = require('chai');
const injectr = require('injectr');
const sinon = require('sinon');

const createAdapter = ({ query } = {}) => {
  const requests = [];
  const pools = [];
  const queryStub = query || sinon.stub().resolves({ recordset: [] });

  class ConnectionPool {
    constructor(config) {
      this.config = config;
      this.connect = sinon.stub().resolves(this);
      this.close = sinon.stub().resolves();
      this.request = sinon.stub().callsFake(() => {
        const request = {
          inputs: [],
          input: sinon.stub().callsFake((name, type, value) => {
            request.inputs.push({ name, type, value });
            return request;
          }),
          query: queryStub
        };
        requests.push(request);
        return request;
      });
      pools.push(this);
    }
  }

  const sqlMock = {
    ConnectionPool,
    NVarChar: (length) => ({ type: 'NVarChar', length }),
    BigInt: { type: 'BigInt' }
  };

  const module = injectr('../dist/index.js', { mssql: sqlMock });

  return {
    adapter: module.default,
    VERSION_ALREADY_EXISTS: module.VERSION_ALREADY_EXISTS,
    pools,
    queryStub,
    requests
  };
};

describe('oc-azure-sql-metadata-adapter', () => {
  describe('isValid()', () => {
    it('should accept a connection string', () => {
      const { adapter } = createAdapter();

      expect(adapter({ connectionString: 'Server=tcp:example;' }).isValid()).to
        .be.true;
    });

    it('should accept server and database config', () => {
      const { adapter } = createAdapter();

      expect(adapter({ server: 'localhost', database: 'oc' }).isValid()).to.be
        .true;
    });

    it('should reject missing connection config', () => {
      const { adapter } = createAdapter();

      expect(adapter().isValid()).to.be.false;
    });

    it('should reject invalid schema or table identifiers', () => {
      const { adapter } = createAdapter();

      expect(
        adapter({
          server: 'localhost',
          database: 'oc',
          schemaName: 'dbo;DROP'
        }).isValid()
      ).to.be.false;
      expect(
        adapter({
          server: 'localhost',
          database: 'oc',
          tableName: 'oc-components'
        }).isValid()
      ).to.be.false;
    });
  });

  describe('initialise()', () => {
    it('should create the schema by default', async () => {
      const { adapter, pools, queryStub } = createAdapter();
      const store = adapter({ connectionString: 'Server=tcp:example;' });

      await store.initialise();

      expect(pools[0].config).to.equal('Server=tcp:example;');
      expect(queryStub.calledOnce).to.be.true;
      const ddl = queryStub.args[0][0];
      expect(ddl).to.contain("OBJECT_ID(N'dbo.oc_components', N'U')");
      expect(ddl).to.contain('CREATE TABLE [dbo].[oc_components]');
      expect(ddl).to.contain('CONSTRAINT pk_oc_components PRIMARY KEY');
      expect(ddl).to.contain(
        'CREATE INDEX ix_oc_components_name ON [dbo].[oc_components] (component_name)'
      );
    });

    it('should verify the schema when manageSchema is false', async () => {
      const { adapter, queryStub } = createAdapter();
      const store = adapter({
        server: 'localhost',
        database: 'oc',
        manageSchema: false,
        schemaName: 'custom_schema',
        tableName: 'custom_components'
      });

      await store.initialise();

      expect(queryStub.calledOnce).to.be.true;
      expect(queryStub.args[0][0]).to.equal(
        'SELECT TOP (0) component_name, version, publish_date, template_size FROM [custom_schema].[custom_components];'
      );
    });

    it('should not pass adapter options to mssql connection config', async () => {
      const { adapter, pools } = createAdapter();
      const store = adapter({
        server: 'localhost',
        database: 'oc',
        manageSchema: false,
        schemaName: 'custom_schema',
        tableName: 'custom_components',
        options: { encrypt: true }
      });

      await store.initialise();

      expect(pools[0].config).to.eql({
        server: 'localhost',
        database: 'oc',
        options: { encrypt: true }
      });
    });

    it('should reject invalid identifiers before opening a pool', async () => {
      const { adapter, pools } = createAdapter();
      const store = adapter({
        server: 'localhost',
        database: 'oc',
        schemaName: 'dbo;DROP'
      });
      let error;

      try {
        await store.initialise();
      } catch (err) {
        error = err;
      }

      expect(error.message).to.equal(
        'schemaName must be a valid SQL identifier'
      );
      expect(pools).to.have.length(0);
    });
  });

  describe('getAllComponents()', () => {
    it('should map SQL rows to component rows', async () => {
      const { adapter, queryStub } = createAdapter({
        query: sinon.stub().resolves({
          recordset: [
            {
              name: 'hello-world',
              version: '1.0.0',
              publishDate: '123',
              templateSize: '456'
            },
            {
              name: 'without-size',
              version: '2.0.0',
              publishDate: 124,
              templateSize: null
            }
          ]
        })
      });
      const store = adapter({ server: 'localhost', database: 'oc' });

      const result = await store.getAllComponents();

      expect(queryStub.calledOnce).to.be.true;
      expect(queryStub.args[0][0]).to.equal(
        'SELECT component_name AS name, version, publish_date AS publishDate, template_size AS templateSize FROM [dbo].[oc_components];'
      );
      expect(result).to.eql([
        {
          name: 'hello-world',
          version: '1.0.0',
          publishDate: 123,
          templateSize: 456
        },
        {
          name: 'without-size',
          version: '2.0.0',
          publishDate: 124
        }
      ]);
    });
  });

  describe('addVersion()', () => {
    it('should insert a parameterized component row', async () => {
      const { adapter, queryStub, requests } = createAdapter();
      const store = adapter({ server: 'localhost', database: 'oc' });

      await store.addVersion({
        name: 'hello-world',
        version: '1.0.0',
        publishDate: 123,
        templateSize: 456
      });

      expect(requests[0].inputs).to.eql([
        {
          name: 'componentName',
          type: { type: 'NVarChar', length: 255 },
          value: 'hello-world'
        },
        {
          name: 'version',
          type: { type: 'NVarChar', length: 64 },
          value: '1.0.0'
        },
        { name: 'publishDate', type: { type: 'BigInt' }, value: 123 },
        { name: 'templateSize', type: { type: 'BigInt' }, value: 456 }
      ]);
      expect(queryStub.calledOnce).to.be.true;
      expect(queryStub.args[0][0]).to.contain(
        'INSERT INTO [dbo].[oc_components] (component_name, version, publish_date, template_size)'
      );
      expect(queryStub.args[0][0]).to.contain(
        'VALUES (@componentName, @version, @publishDate, @templateSize);'
      );
    });

    it('should insert null templateSize when omitted', async () => {
      const { adapter, requests } = createAdapter();
      const store = adapter({ server: 'localhost', database: 'oc' });

      await store.addVersion({
        name: 'hello-world',
        version: '1.0.0',
        publishDate: 123
      });

      expect(requests[0].inputs[3]).to.eql({
        name: 'templateSize',
        type: { type: 'BigInt' },
        value: null
      });
    });

    it('should reuse the same pool across calls', async () => {
      const { adapter, pools, queryStub } = createAdapter();
      const store = adapter({ server: 'localhost', database: 'oc' });

      await store.initialise();
      await store.getAllComponents();
      await store.addVersion({
        name: 'hello-world',
        version: '1.0.0',
        publishDate: 123
      });

      expect(pools).to.have.length(1);
      expect(pools[0].connect.calledOnce).to.be.true;
      expect(pools[0].request.calledThrice).to.be.true;
      expect(queryStub.calledThrice).to.be.true;
    });

    for (const number of [2627, 2601]) {
      it(`should map SQL Server unique violation ${number} to VERSION_ALREADY_EXISTS`, async () => {
        const originalError = Object.assign(new Error('duplicate'), { number });
        const { adapter, VERSION_ALREADY_EXISTS } = createAdapter({
          query: sinon.stub().rejects(originalError)
        });
        const store = adapter({ server: 'localhost', database: 'oc' });
        let error;

        try {
          await store.addVersion({
            name: 'hello-world',
            version: '1.0.0',
            publishDate: 123
          });
        } catch (err) {
          error = err;
        }

        expect(error.message).to.equal('Component version already exists');
        expect(error.code).to.equal(VERSION_ALREADY_EXISTS);
        expect(error.cause).to.equal(originalError);
      });
    }

    it('should rethrow non-unique SQL errors', async () => {
      const originalError = Object.assign(new Error('timeout'), {
        number: 50000
      });
      const { adapter } = createAdapter({
        query: sinon.stub().rejects(originalError)
      });
      const store = adapter({ server: 'localhost', database: 'oc' });
      let error;

      try {
        await store.addVersion({
          name: 'hello-world',
          version: '1.0.0',
          publishDate: 123
        });
      } catch (err) {
        error = err;
      }

      expect(error).to.equal(originalError);
    });
  });

  describe('close()', () => {
    it('should close an existing pool', async () => {
      const { adapter, pools } = createAdapter();
      const store = adapter({ server: 'localhost', database: 'oc' });

      await store.initialise();
      const openedPool = pools[0];
      await store.close();

      expect(openedPool.close.calledOnce).to.be.true;
    });

    it('should be safe when no pool exists', async () => {
      const { adapter, pools } = createAdapter();
      const store = adapter({ server: 'localhost', database: 'oc' });

      await store.close();

      expect(pools).to.have.length(0);
    });

    it('should allow a later operation to create a new pool', async () => {
      const { adapter, pools, queryStub } = createAdapter();
      const store = adapter({ server: 'localhost', database: 'oc' });

      await store.initialise();
      await store.close();
      await store.getAllComponents();

      expect(pools).to.have.length(2);
      expect(pools[0].close.calledOnce).to.be.true;
      expect(pools[1].connect.calledOnce).to.be.true;
      expect(queryStub.calledTwice).to.be.true;
    });

    it('should support customised schema and table names', async () => {
      const { adapter, queryStub } = createAdapter();
      const store = adapter({
        server: 'localhost',
        database: 'oc',
        schemaName: 'registry',
        tableName: 'oc_components'
      });

      await store.initialise();
      await store.close();

      const ddl = queryStub.args[0][0];
      expect(ddl).to.contain("OBJECT_ID(N'registry.oc_components', N'U')");
      expect(ddl).to.contain('CREATE TABLE [registry].[oc_components]');
    });
  });
});
