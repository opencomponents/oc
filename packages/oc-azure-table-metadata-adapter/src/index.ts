import {
  AzureNamedKeyCredential,
  AzureSASCredential,
  TableClient,
  TableServiceClient,
  type TableServiceClientOptions
} from '@azure/data-tables';
import { DefaultAzureCredential, type TokenCredential } from '@azure/identity';
import {
  type ComponentRow,
  type MetadataStore,
  VERSION_ALREADY_EXISTS,
  type VersionAlreadyExistsError
} from 'oc-metadata-adapters-utils';

export type { ComponentRow, MetadataStore } from 'oc-metadata-adapters-utils';
export { VERSION_ALREADY_EXISTS } from 'oc-metadata-adapters-utils';

export interface AzureTableMetadataAdapterOptions {
  /** Storage account connection string. If present, used instead of endpoint + credentials. */
  connectionString?: string;
  /** Table service endpoint URL (e.g. https://<account>.table.core.windows.net). Required when connectionString is not used. */
  endpoint?: string;
  /** Storage account name. Required with accountKey when connectionString is not used. */
  accountName?: string;
  /** Storage account key. Required with accountName when connectionString is not used. */
  accountKey?: string;
  /** SAS token for authentication. Optional alternative to accountKey. */
  sasToken?: string;
  /**
   * Token credential for Microsoft Entra ID (managed identity / workload
   * identity / etc). When `connectionString`, account key and SAS token are all
   * absent but an `endpoint` is provided, a `DefaultAzureCredential` is used
   * automatically. Pass an explicit credential here to override that default.
   */
  credential?: TokenCredential;
  /** Azure Table name. Defaults to "occomponents". Must be 3-63 chars, alphanumeric only. */
  tableName?: string;
  /** When true (default), create the table if it doesn't exist. When false, verify it exists. */
  manageSchema?: boolean;
  /** Allow insecure (HTTP) connections — for Azurite / local development. */
  allowInsecureConnection?: boolean;
}

type TableError = Error & {
  statusCode?: number;
  code?: string;
  response?: { status?: number };
};

const CONFLICT_STATUS = 409;
const NOT_FOUND_STATUS = 404;

const isValidTableName = (value: string): boolean =>
  /^[A-Za-z][A-Za-z0-9]{2,62}$/.test(value);

const getVersionAlreadyExistsError = (
  error: unknown
): VersionAlreadyExistsError => {
  const err = new Error(
    'Component version already exists'
  ) as VersionAlreadyExistsError;
  err.code = VERSION_ALREADY_EXISTS;
  err.cause = error;
  return err;
};

const isConflictError = (error: unknown): boolean => {
  const err = error as TableError;
  return (
    err?.statusCode === CONFLICT_STATUS ||
    err?.response?.status === CONFLICT_STATUS
  );
};

export default function azureTableMetadataAdapter(
  options?: AzureTableMetadataAdapterOptions
): MetadataStore {
  const adapterType = 'azure-table';
  const opts = options || ({} as AzureTableMetadataAdapterOptions);
  const manageSchema = opts.manageSchema !== false;
  const tableName = opts.tableName || 'occomponents';
  let client: TableClient | undefined;

  const clientOptions: TableServiceClientOptions = {
    allowInsecureConnection: opts.allowInsecureConnection ?? false
  };

  // Resolve the credential used for both the per-table and the service-level
  // client so every auth mode (named key, SAS, explicit token, or ambient
  // managed identity) is handled identically. `connectionString` is handled
  // separately by the SDK's `fromConnectionString` factories.
  const getCredential = ():
    | AzureNamedKeyCredential
    | AzureSASCredential
    | TokenCredential => {
    if (opts.accountName && opts.accountKey) {
      return new AzureNamedKeyCredential(opts.accountName, opts.accountKey);
    }
    if (opts.sasToken) {
      return new AzureSASCredential(opts.sasToken);
    }
    return opts.credential ?? new DefaultAzureCredential();
  };

  const createClient = (): TableClient => {
    if (client) return client;

    if (opts.connectionString) {
      client = TableClient.fromConnectionString(
        opts.connectionString,
        tableName,
        clientOptions
      );
    } else if (opts.endpoint) {
      // The constructor exposes the three credential kinds as separate
      // overloads, so a union argument can't be resolved at the type level; the
      // runtime branches on the concrete credential, so the cast is safe.
      client = new TableClient(
        opts.endpoint,
        tableName,
        getCredential() as TokenCredential,
        clientOptions
      );
    }

    if (!client) {
      throw new Error(
        'Azure Table metadata adapter requires either a connectionString or an endpoint (with credentials or managed identity)'
      );
    }

    return client;
  };

  const createServiceClient = (): TableServiceClient => {
    if (opts.connectionString) {
      return TableServiceClient.fromConnectionString(
        opts.connectionString,
        clientOptions
      );
    }

    if (!opts.endpoint) {
      throw new Error(
        'Azure Table metadata adapter requires either a connectionString or an endpoint (with credentials or managed identity)'
      );
    }

    return new TableServiceClient(
      opts.endpoint,
      getCredential() as TokenCredential,
      clientOptions
    );
  };

  return {
    adapterType,

    isValid(): boolean {
      if (!isValidTableName(tableName)) {
        return false;
      }

      if (opts.connectionString) {
        return true;
      }

      // An endpoint is enough: credentials may be a named key, SAS token,
      // explicit token credential, or ambient managed identity resolved at
      // runtime via DefaultAzureCredential.
      return Boolean(opts.endpoint);
    },

    async initialise(): Promise<void> {
      if (!isValidTableName(tableName)) {
        throw new Error('tableName must be a valid Azure Table name');
      }

      const activeClient = createClient();

      if (manageSchema) {
        const serviceClient = createServiceClient();
        await serviceClient.createTable(tableName);
      } else {
        // Verify the table exists by reading the first page of entities.
        // listEntities throws a 404 only when the table itself is missing and
        // resolves for an existing table even when empty — which sidesteps the
        // table-vs-entity 404 ambiguity of getEntity, so we genuinely fail fast.
        const iterator = activeClient
          .listEntities<any>()
          [Symbol.asyncIterator]();
        await iterator.next().catch((err: TableError) => {
          if (
            err?.statusCode === NOT_FOUND_STATUS ||
            err?.response?.status === NOT_FOUND_STATUS
          ) {
            throw new Error(`Azure table "${tableName}" does not exist`);
          }
          throw err;
        });
      }
    },

    async getAllComponents(): Promise<ComponentRow[]> {
      const activeClient = createClient();
      const rows: ComponentRow[] = [];

      for await (const entity of activeClient.listEntities<any>()) {
        const row: ComponentRow = {
          name: entity.partitionKey,
          version: entity.rowKey,
          publishDate: Number(entity.publishDate)
        };

        if (entity.templateSize !== undefined && entity.templateSize !== null) {
          row.templateSize = Number(entity.templateSize);
        }

        rows.push(row);
      }

      return rows;
    },

    async addVersion(row: ComponentRow): Promise<void> {
      const activeClient = createClient();
      try {
        await activeClient.createEntity({
          partitionKey: row.name,
          rowKey: row.version,
          publishDate: row.publishDate,
          templateSize: row.templateSize ?? null,
          createdAt: Date.now()
        });
      } catch (error) {
        if (isConflictError(error)) {
          throw getVersionAlreadyExistsError(error);
        }
        throw error;
      }
    },

    async close(): Promise<void> {
      client = undefined;
    }
  };
}
