import {
  AzureNamedKeyCredential,
  AzureSASCredential,
  TableClient,
  TableServiceClient
} from '@azure/data-tables';
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
  /** Azure Table name. Defaults to "occomponents". Must be 3-63 chars, alphanumeric only. */
  tableName?: string;
  /** When true (default), create the table if it doesn't exist. When false, verify it exists. */
  manageSchema?: boolean;
  /** Allow insecure (HTTP) connections — for Azurite / local development. */
  allowInsecureConnection?: boolean;
}

type TableError = Error & {
  statusCode?: number;
  response?: { status?: number };
};

const CONFLICT_STATUS = 409;

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

  const createClient = (): TableClient => {
    if (client) return client;

    const clientOptions = {
      allowInsecureConnection: opts.allowInsecureConnection ?? false
    };

    if (opts.connectionString) {
      client = TableClient.fromConnectionString(
        opts.connectionString,
        tableName,
        clientOptions
      );
    } else if (opts.endpoint) {
      if (opts.accountName && opts.accountKey) {
        const credential = new AzureNamedKeyCredential(
          opts.accountName,
          opts.accountKey
        );
        client = new TableClient(
          opts.endpoint,
          tableName,
          credential,
          clientOptions
        );
      } else if (opts.sasToken) {
        const credential = new AzureSASCredential(opts.sasToken);
        client = new TableClient(
          opts.endpoint,
          tableName,
          credential,
          clientOptions
        );
      }
    }

    if (!client) {
      throw new Error(
        'Azure Table metadata adapter requires either a connectionString or endpoint + credentials'
      );
    }

    return client;
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

      return Boolean(
        opts.endpoint &&
          ((opts.accountName && opts.accountKey) || opts.sasToken)
      );
    },

    async initialise(): Promise<void> {
      if (!isValidTableName(tableName)) {
        throw new Error('tableName must be a valid Azure Table name');
      }

      const activeClient = createClient();

      if (manageSchema) {
        const serviceClient = TableServiceClient.fromConnectionString(
          opts.connectionString ||
            `DefaultEndpointsProtocol=https;AccountName=${opts.accountName};AccountKey=${opts.accountKey};TableEndpoint=${opts.endpoint}`,
          { allowInsecureConnection: opts.allowInsecureConnection ?? false }
        );
        await serviceClient.createTable(tableName);
      } else {
        await activeClient
          .getEntity<any>('__oc_schema_check', '__check__')
          .catch((err: TableError) => {
            if (err?.statusCode === 404) {
              return;
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
