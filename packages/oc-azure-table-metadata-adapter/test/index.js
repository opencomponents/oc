const { expect } = require('chai');
const injectr = require('injectr');
const sinon = require('sinon');

const createAdapter = ({
  createEntity,
  listEntities,
  createTable,
  getEntity,
  updateEntity,
  deleteEntity,
  upsertEntity
} = {}) => {
  const createdEntities = [];
  const upsertedEntities = [];
  const createEntityStub =
    createEntity ||
    sinon.stub().callsFake((entity) => {
      createdEntities.push(entity);
      return Promise.resolve();
    });

  const listEntitiesStub =
    listEntities ||
    sinon.stub().returns({
      async *[Symbol.asyncIterator]() {
        yield {
          partitionKey: 'hello-world',
          rowKey: '1.0.0',
          publishDate: 123,
          templateSize: 456
        };
        yield {
          partitionKey: 'hello-world',
          rowKey: '2.0.0',
          publishDate: 124,
          templateSize: null
        };
      }
    });

  const createTableStub = createTable || sinon.stub().resolves();
  const getEntityStub = getEntity || sinon.stub().rejects({ statusCode: 404 });
  const updateEntityStub = updateEntity || sinon.stub().resolves();
  const deleteEntityStub = deleteEntity || sinon.stub().resolves();
  const upsertEntityStub =
    upsertEntity ||
    sinon.stub().callsFake((entity) => {
      upsertedEntities.push(entity);
      return Promise.resolve();
    });

  const tableClients = [];
  const serviceClients = [];

  class AzureNamedKeyCredential {
    constructor(name, key) {
      this.kind = 'namedKey';
      this.name = name;
      this.key = key;
    }
  }

  class AzureSASCredential {
    constructor(signature) {
      this.kind = 'sas';
      this.signature = signature;
    }
  }

  class TableClient {
    constructor(url, tableName, credential, options) {
      this.url = url;
      this.tableName = tableName;
      this.credential = credential;
      this.options = options;
      this.createEntity = createEntityStub;
      this.listEntities = listEntitiesStub;
      this.getEntity = getEntityStub;
      this.updateEntity = updateEntityStub;
      this.deleteEntity = deleteEntityStub;
      this.upsertEntity = upsertEntityStub;
      tableClients.push(this);
    }
  }

  TableClient.fromConnectionString = sinon
    .stub()
    .callsFake(
      (_connectionString, tableName, options) =>
        new TableClient('from-conn-string', tableName, null, options)
    );

  class TableServiceClient {
    constructor(url, credential, options) {
      this.url = url;
      this.credential = credential;
      this.options = options;
      this.createTable = createTableStub;
      serviceClients.push(this);
    }
  }

  TableServiceClient.fromConnectionString = sinon
    .stub()
    .callsFake(
      (connectionString, options) =>
        new TableServiceClient(connectionString, undefined, options)
    );

  const module = injectr('../dist/index.js', {
    '@azure/data-tables': {
      TableClient,
      TableServiceClient,
      AzureNamedKeyCredential,
      AzureSASCredential
    },
    '@azure/identity': {
      DefaultAzureCredential: class DefaultAzureCredential {
        constructor() {
          this.kind = 'default';
        }
      }
    }
  });

  return {
    adapter: module.default,
    VERSION_ALREADY_EXISTS: module.VERSION_ALREADY_EXISTS,
    createEntityStub,
    listEntitiesStub,
    createTableStub,
    getEntityStub,
    updateEntityStub,
    deleteEntityStub,
    upsertEntityStub,
    createdEntities,
    upsertedEntities,
    tableClients,
    serviceClients,
    TableServiceClient
  };
};

describe('oc-azure-table-metadata-adapter', () => {
  describe('isValid()', () => {
    it('should accept a connection string', () => {
      const { adapter } = createAdapter();

      expect(
        adapter({
          connectionString:
            'DefaultEndpointsProtocol=https;AccountName=foo;AccountKey=bar;'
        }).isValid()
      ).to.be.true;
    });

    it('should accept endpoint with account name and key', () => {
      const { adapter } = createAdapter();

      expect(
        adapter({
          endpoint: 'https://foo.table.core.windows.net',
          accountName: 'foo',
          accountKey: 'bar'
        }).isValid()
      ).to.be.true;
    });

    it('should accept endpoint with SAS token', () => {
      const { adapter } = createAdapter();

      expect(
        adapter({
          endpoint: 'https://foo.table.core.windows.net',
          sasToken: 'sv=2020-08-04&sig=abc'
        }).isValid()
      ).to.be.true;
    });

    it('should reject missing connection config', () => {
      const { adapter } = createAdapter();

      expect(adapter().isValid()).to.be.false;
    });

    it('should accept endpoint without explicit credentials (managed identity)', () => {
      const { adapter } = createAdapter();

      expect(
        adapter({ endpoint: 'https://foo.table.core.windows.net' }).isValid()
      ).to.be.true;
    });

    it('should reject when neither connection string nor endpoint is provided', () => {
      const { adapter } = createAdapter();

      expect(adapter({ accountName: 'foo', accountKey: 'bar' }).isValid()).to.be
        .false;
    });

    it('should reject invalid table names', () => {
      const { adapter } = createAdapter();

      expect(
        adapter({
          connectionString: 'foo',
          tableName: '1invalid'
        }).isValid()
      ).to.be.false;
      expect(
        adapter({
          connectionString: 'foo',
          tableName: 'ab'
        }).isValid()
      ).to.be.false;
      expect(
        adapter({
          connectionString: 'foo',
          tableName: 'has-dash'
        }).isValid()
      ).to.be.false;
    });
  });

  describe('initialise()', () => {
    it('should create the table by default', async () => {
      const { adapter, createTableStub } = createAdapter();
      const store = adapter({ connectionString: 'foo' });

      await store.initialise();

      expect(createTableStub.calledOnce).to.be.true;
      expect(createTableStub.args[0][0]).to.equal('occomponents');
    });

    it('should use a custom table name', async () => {
      const { adapter, createTableStub } = createAdapter();
      const store = adapter({
        connectionString: 'foo',
        tableName: 'mycomponents'
      });

      await store.initialise();

      expect(createTableStub.args[0][0]).to.equal('mycomponents');
    });

    it('should verify the table by listing entities when manageSchema is false', async () => {
      const { adapter, listEntitiesStub, createTableStub } = createAdapter();
      const store = adapter({
        connectionString: 'foo',
        manageSchema: false
      });

      await store.initialise();

      expect(listEntitiesStub.calledOnce).to.be.true;
      expect(createTableStub.called).to.be.false;
    });

    it('should verify successfully against an existing empty table', async () => {
      const { adapter } = createAdapter({
        listEntities: sinon.stub().returns({
          [Symbol.asyncIterator]: () => ({
            next: () => Promise.resolve({ done: true, value: undefined })
          })
        })
      });
      const store = adapter({ connectionString: 'foo', manageSchema: false });

      await store.initialise();
    });

    it('should fail fast when manageSchema is false and the table is missing', async () => {
      const { adapter } = createAdapter({
        listEntities: sinon.stub().returns({
          [Symbol.asyncIterator]: () => ({
            next: () =>
              Promise.reject({ statusCode: 404, code: 'TableNotFound' })
          })
        })
      });
      const store = adapter({
        endpoint: 'https://foo.table.core.windows.net',
        accountName: 'foo',
        accountKey: 'bar',
        manageSchema: false
      });
      let error;

      try {
        await store.initialise();
      } catch (err) {
        error = err;
      }

      expect(error).to.be.an('error');
      expect(error.message).to.contain('does not exist');
    });

    it('should create the table via the service client when using a SAS token', async () => {
      const { adapter, createTableStub, serviceClients, TableServiceClient } =
        createAdapter();
      const store = adapter({
        endpoint: 'https://foo.table.core.windows.net',
        sasToken: 'sv=2020-08-04&sig=abc'
      });

      await store.initialise();

      // The previous implementation synthesised a bogus connection string for
      // SAS auth; it must now build the service client from the endpoint.
      expect(TableServiceClient.fromConnectionString.called).to.be.false;
      expect(createTableStub.calledOnce).to.be.true;
      expect(serviceClients).to.have.length(1);
      expect(serviceClients[0].url).to.equal(
        'https://foo.table.core.windows.net'
      );
      expect(serviceClients[0].credential.kind).to.equal('sas');
    });

    it('should use a DefaultAzureCredential when only an endpoint is provided', async () => {
      const { adapter, serviceClients } = createAdapter();
      const store = adapter({
        endpoint: 'https://foo.table.core.windows.net'
      });

      await store.initialise();

      expect(serviceClients).to.have.length(1);
      expect(serviceClients[0].credential.kind).to.equal('default');
    });

    it('should throw on invalid table name', async () => {
      const { adapter, createTableStub } = createAdapter();
      const store = adapter({ connectionString: 'foo', tableName: '1bad' });
      let error;

      try {
        await store.initialise();
      } catch (err) {
        error = err;
      }

      expect(error.message).to.contain('valid Azure Table name');
      expect(createTableStub.called).to.be.false;
    });
  });

  describe('getAllComponents()', () => {
    it('should map table entities to component rows', async () => {
      const { adapter } = createAdapter();
      const store = adapter({ connectionString: 'foo' });

      const result = await store.getAllComponents();

      expect(result).to.eql([
        {
          name: 'hello-world',
          version: '1.0.0',
          publishDate: 123,
          templateSize: 456
        },
        {
          name: 'hello-world',
          version: '2.0.0',
          publishDate: 124
        }
      ]);
    });

    it('should return empty array when no entities exist', async () => {
      const { adapter } = createAdapter({
        listEntities: sinon.stub().returns({
          async *[Symbol.asyncIterator]() {}
        })
      });
      const store = adapter({ connectionString: 'foo' });

      const result = await store.getAllComponents();

      expect(result).to.eql([]);
    });
  });

  describe('addVersion()', () => {
    it('should insert an entity with partitionKey and rowKey', async () => {
      const { adapter, createEntityStub, createdEntities, upsertEntityStub } =
        createAdapter();
      const store = adapter({ connectionString: 'foo' });

      await store.addVersion({
        name: 'hello-world',
        version: '1.0.0',
        publishDate: 123,
        templateSize: 456
      });

      expect(createEntityStub.calledOnce).to.be.true;
      expect(createdEntities[0]).to.eql({
        partitionKey: 'hello-world',
        rowKey: '1.0.0',
        publishDate: 123,
        templateSize: 456,
        status: 'committed',
        createdAt: createdEntities[0].createdAt,
        updatedAt: createdEntities[0].updatedAt
      });
      expect(createdEntities[0]).to.not.have.property('publishToken');
      expect(upsertEntityStub.calledOnce).to.be.true;
    });

    it('should omit templateSize when omitted', async () => {
      const { adapter, createdEntities } = createAdapter();
      const store = adapter({ connectionString: 'foo' });

      await store.addVersion({
        name: 'hello-world',
        version: '1.0.0',
        publishDate: 123
      });

      expect(createdEntities[0]).to.not.have.property('templateSize');
    });

    it('should map 409 conflict to VERSION_ALREADY_EXISTS', async () => {
      const conflictError = Object.assign(new Error('Conflict'), {
        statusCode: 409
      });
      const { adapter, VERSION_ALREADY_EXISTS } = createAdapter({
        createEntity: sinon.stub().rejects(conflictError),
        getEntity: sinon.stub().resolves({ status: 'committed' })
      });
      const store = adapter({ connectionString: 'foo' });
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
      expect(error.cause).to.equal(conflictError);
    });

    it('should commit stale reservations during backfill addVersion', async () => {
      const conflictError = Object.assign(new Error('Conflict'), {
        statusCode: 409
      });
      const oldNow = Date.now() - 10_000;
      const staleEntity = {
        partitionKey: 'hello-world',
        rowKey: '1.0.0',
        publishDate: 1,
        templateSize: 2,
        status: 'publishing',
        publishToken: 'stale-token',
        createdAt: oldNow,
        updatedAt: oldNow,
        etag: 'etag-1'
      };
      const { adapter, updateEntityStub } = createAdapter({
        createEntity: sinon.stub().rejects(conflictError),
        getEntity: sinon.stub().resolves(staleEntity)
      });
      const store = adapter({
        connectionString: 'foo',
        reservationTtlSeconds: 1
      });

      await store.addVersion({
        name: 'hello-world',
        version: '1.0.0',
        publishDate: 123,
        templateSize: 456
      });

      expect(updateEntityStub.calledOnce).to.be.true;
      expect(updateEntityStub.args[0][0]).to.include({
        partitionKey: 'hello-world',
        rowKey: '1.0.0',
        publishDate: 123,
        templateSize: 456,
        status: 'committed'
      });
      expect(updateEntityStub.args[0][0]).to.not.have.property('publishToken');
      expect(updateEntityStub.args[0][2]).to.eql({ etag: 'etag-1' });
    });

    it('should rethrow non-conflict errors', async () => {
      const timeoutError = Object.assign(new Error('timeout'), {
        statusCode: 500
      });
      const { adapter } = createAdapter({
        createEntity: sinon.stub().rejects(timeoutError)
      });
      const store = adapter({ connectionString: 'foo' });
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

      expect(error).to.equal(timeoutError);
    });
  });

  describe('reservation lifecycle', () => {
    it('should reserve a version as publishing and return a token', async () => {
      const { adapter, createdEntities } = createAdapter();
      const store = adapter({ connectionString: 'foo' });

      const reservation = await store.reserveVersion({
        name: 'hello-world',
        version: '1.0.0',
        publishDate: 123,
        templateSize: 456
      });

      expect(reservation.token).to.be.a('string');
      expect(createdEntities[0]).to.include({
        partitionKey: 'hello-world',
        rowKey: '1.0.0',
        publishDate: 123,
        templateSize: 456,
        status: 'publishing',
        publishToken: reservation.token
      });
    });

    it('should map duplicate reservation to VERSION_PUBLISH_IN_PROGRESS', async () => {
      const conflictError = Object.assign(new Error('Conflict'), {
        statusCode: 409
      });
      const { adapter } = createAdapter({
        createEntity: sinon.stub().rejects(conflictError),
        getEntity: sinon.stub().resolves({ status: 'publishing' })
      });
      const store = adapter({ connectionString: 'foo' });
      let error;

      try {
        await store.reserveVersion({
          name: 'hello-world',
          version: '1.0.0',
          publishDate: 123
        });
      } catch (err) {
        error = err;
      }

      expect(error.code).to.equal('VERSION_PUBLISH_IN_PROGRESS');
      expect(error.cause).to.equal(conflictError);
    });

    it('should map duplicate reservation on committed rows to VERSION_ALREADY_EXISTS', async () => {
      const conflictError = Object.assign(new Error('Conflict'), {
        statusCode: 409
      });
      const { adapter } = createAdapter({
        createEntity: sinon.stub().rejects(conflictError),
        getEntity: sinon.stub().resolves({ status: 'committed' })
      });
      const store = adapter({ connectionString: 'foo' });
      let error;

      try {
        await store.reserveVersion({
          name: 'hello-world',
          version: '1.0.0',
          publishDate: 123
        });
      } catch (err) {
        error = err;
      }

      expect(error.code).to.equal('VERSION_ALREADY_EXISTS');
      expect(error.cause).to.equal(conflictError);
    });

    it('should reclaim stale reservations before retrying reserve', async () => {
      const conflictError = Object.assign(new Error('Conflict'), {
        statusCode: 409
      });
      const createEntity = sinon.stub();
      createEntity.onFirstCall().rejects(conflictError);
      createEntity.onSecondCall().resolves();
      const oldNow = Date.now() - 10_000;
      const { adapter, deleteEntityStub } = createAdapter({
        createEntity,
        getEntity: sinon.stub().resolves({
          status: 'publishing',
          publishToken: 'stale-token',
          updatedAt: oldNow,
          etag: 'etag-1'
        })
      });
      const store = adapter({
        connectionString: 'foo',
        reservationTtlSeconds: 1
      });

      const reservation = await store.reserveVersion({
        name: 'hello-world',
        version: '1.0.0',
        publishDate: 123
      });

      expect(reservation.token).to.be.a('string');
      expect(
        deleteEntityStub.calledOnceWith('hello-world', '1.0.0', {
          etag: 'etag-1'
        })
      ).to.be.true;
      expect(createEntity.calledTwice).to.be.true;
      expect(createEntity.args[1][0]).to.include({
        partitionKey: 'hello-world',
        rowKey: '1.0.0',
        status: 'publishing',
        publishToken: reservation.token
      });
    });

    it('should commit a matching reservation', async () => {
      const entity = {
        partitionKey: 'hello-world',
        rowKey: '1.0.0',
        publishDate: 123,
        status: 'publishing',
        publishToken: 'publish-token',
        etag: 'etag-1'
      };
      const { adapter, updateEntityStub, upsertEntityStub } = createAdapter({
        getEntity: sinon.stub().resolves(entity)
      });
      const store = adapter({ connectionString: 'foo' });

      await store.commitVersion('hello-world', '1.0.0', 'publish-token');

      expect(updateEntityStub.calledOnce).to.be.true;
      expect(updateEntityStub.args[0][0]).to.include({
        status: 'committed'
      });
      expect(updateEntityStub.args[0][0]).to.not.have.property('publishToken');
      expect(updateEntityStub.args[0][2]).to.eql({ etag: 'etag-1' });
      expect(upsertEntityStub.calledOnce).to.be.true;
    });

    it('should throw when commit sees a mismatched reservation token', async () => {
      const { adapter, updateEntityStub } = createAdapter({
        getEntity: sinon.stub().resolves({
          status: 'publishing',
          publishToken: 'other-token'
        })
      });
      const store = adapter({ connectionString: 'foo' });
      let error;

      try {
        await store.commitVersion('hello-world', '1.0.0', 'publish-token');
      } catch (err) {
        error = err;
      }

      expect(error.message).to.equal(
        'Component version reservation could not be committed'
      );
      expect(updateEntityStub.called).to.be.false;
    });

    it('should abort a matching reservation', async () => {
      const { adapter, deleteEntityStub } = createAdapter({
        getEntity: sinon.stub().resolves({
          status: 'publishing',
          publishToken: 'publish-token',
          etag: 'etag-1'
        })
      });
      const store = adapter({ connectionString: 'foo' });

      await store.abortVersion('hello-world', '1.0.0', 'publish-token');

      expect(
        deleteEntityStub.calledOnceWith('hello-world', '1.0.0', {
          etag: 'etag-1'
        })
      ).to.be.true;
    });

    it('should throw when abort sees a mismatched reservation token', async () => {
      const { adapter, deleteEntityStub } = createAdapter({
        getEntity: sinon.stub().resolves({
          status: 'publishing',
          publishToken: 'other-token'
        })
      });
      const store = adapter({ connectionString: 'foo' });
      let error;

      try {
        await store.abortVersion('hello-world', '1.0.0', 'publish-token');
      } catch (err) {
        error = err;
      }

      expect(error.message).to.equal(
        'Component version reservation could not be aborted'
      );
      expect(deleteEntityStub.called).to.be.false;
    });

    it('should return the cursor etag as the change token', async () => {
      const { adapter } = createAdapter({
        getEntity: sinon.stub().resolves({ etag: 'etag-cursor' })
      });
      const store = adapter({ connectionString: 'foo' });

      const token = await store.getChangeToken();

      expect(token).to.equal('etag-cursor');
    });

    it('should return an empty change token before the cursor exists', async () => {
      const { adapter } = createAdapter({
        getEntity: sinon.stub().rejects({ statusCode: 404 })
      });
      const store = adapter({ connectionString: 'foo' });

      const token = await store.getChangeToken();

      expect(token).to.equal('');
    });
  });

  describe('close()', () => {
    it('should be safe to call with no active client', async () => {
      const { adapter } = createAdapter();
      const store = adapter({ connectionString: 'foo' });

      await store.close();
    });

    it('should allow operations after close (creates a new client)', async () => {
      const { adapter, createEntityStub } = createAdapter();
      const store = adapter({ connectionString: 'foo' });

      await store.addVersion({
        name: 'hello-world',
        version: '1.0.0',
        publishDate: 123
      });
      await store.close();
      await store.addVersion({
        name: 'hello-world',
        version: '2.0.0',
        publishDate: 124
      });

      expect(createEntityStub.calledTwice).to.be.true;
    });
  });
});
