import { randomUUID } from 'node:crypto';
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
  VERSION_PUBLISH_IN_PROGRESS,
  type VersionAlreadyExistsError
} from 'oc-metadata-adapters-utils';

export type { ComponentRow, MetadataStore } from 'oc-metadata-adapters-utils';
export {
  VERSION_ALREADY_EXISTS,
  VERSION_PUBLISH_IN_PROGRESS
} from 'oc-metadata-adapters-utils';

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
  /** Seconds before an uncommitted publish reservation can be reclaimed. */
  reservationTtlSeconds?: number;
}

type TableError = Error & {
  statusCode?: number;
  code?: string;
  response?: { status?: number };
};

type ComponentEntity = {
  partitionKey: string;
  rowKey: string;
  publishDate: number;
  status: 'committed' | 'publishing';
  createdAt: number;
  updatedAt: number;
  templateSize?: number;
  publishToken?: string;
};

const CONFLICT_STATUS = 409;
const NOT_FOUND_STATUS = 404;
const PRECONDITION_FAILED_STATUS = 412;
const DEFAULT_RESERVATION_TTL_SECONDS = 60 * 60;
const CURSOR_PARTITION_KEY = 'oc.metadata';
const CURSOR_ROW_KEY = 'cursor';

const isValidTableName = (value: string): boolean =>
  /^[A-Za-z][A-Za-z0-9]{2,62}$/.test(value);

const getVersionAlreadyExistsError = (
  error: unknown,
  code:
    | typeof VERSION_ALREADY_EXISTS
    | typeof VERSION_PUBLISH_IN_PROGRESS = VERSION_ALREADY_EXISTS
): VersionAlreadyExistsError => {
  const err = new Error(
    code === VERSION_PUBLISH_IN_PROGRESS
      ? 'Component version publish is in progress'
      : 'Component version already exists'
  ) as VersionAlreadyExistsError;
  err.code = code;
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

const isNotFoundError = (error: unknown): boolean => {
  const err = error as TableError;
  return (
    err?.statusCode === NOT_FOUND_STATUS ||
    err?.response?.status === NOT_FOUND_STATUS
  );
};

const isPreconditionFailedError = (error: unknown): boolean => {
  const err = error as TableError;
  return (
    err?.statusCode === PRECONDITION_FAILED_STATUS ||
    err?.response?.status === PRECONDITION_FAILED_STATUS
  );
};

const getReservationTtlMs = (value: unknown): number =>
  (typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : DEFAULT_RESERVATION_TTL_SECONDS) * 1000;

const isStalePublishingEntity = (entity: any, ttlMs: number): boolean =>
  entity?.status === 'publishing' &&
  Number(entity.updatedAt) < Date.now() - ttlMs;

const getEntityAlreadyExistsError = (
  entity: any,
  error: unknown
): VersionAlreadyExistsError =>
  getVersionAlreadyExistsError(
    error,
    entity?.status === 'publishing'
      ? VERSION_PUBLISH_IN_PROGRESS
      : VERSION_ALREADY_EXISTS
  );

const getComponentEntity = (
  row: ComponentRow,
  status: 'committed' | 'publishing'
): ComponentEntity => {
  const now = Date.now();
  const entity: ComponentEntity = {
    partitionKey: row.name,
    rowKey: row.version,
    publishDate: row.publishDate,
    status,
    createdAt: now,
    updatedAt: now
  };

  if (row.templateSize !== undefined) {
    entity.templateSize = row.templateSize;
  }

  return entity;
};

export default function azureTableMetadataAdapter(
  options?: AzureTableMetadataAdapterOptions
): MetadataStore {
  const adapterType = 'azure-table';
  const opts = options || ({} as AzureTableMetadataAdapterOptions);
  const manageSchema = opts.manageSchema !== false;
  const tableName = opts.tableName || 'occomponents';
  const reservationTtlMs = getReservationTtlMs(opts.reservationTtlSeconds);
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

  const bumpChangeToken = async (): Promise<void> => {
    const activeClient = createClient();
    await activeClient.upsertEntity(
      {
        partitionKey: CURSOR_PARTITION_KEY,
        rowKey: CURSOR_ROW_KEY,
        status: 'cursor',
        updatedAt: Date.now()
      },
      'Replace'
    );
  };

  const bumpChangeTokenBestEffort = async (): Promise<void> => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        await bumpChangeToken();
        return;
      } catch {
        // Best-effort signal only: the core forced refresh bounds staleness.
      }
    }
  };

  const getExistingEntity = async (
    name: string,
    version: string
  ): Promise<any | undefined> => {
    try {
      return await createClient().getEntity<any>(name, version);
    } catch (error) {
      if (isNotFoundError(error)) {
        return undefined;
      }
      throw error;
    }
  };

  const deleteStaleReservation = async (
    name: string,
    version: string,
    entity?: any
  ): Promise<boolean> => {
    const existing = entity ?? (await getExistingEntity(name, version));
    if (!isStalePublishingEntity(existing, reservationTtlMs)) {
      return false;
    }

    try {
      await createClient().deleteEntity(name, version, { etag: existing.etag });
      return true;
    } catch (error) {
      if (isNotFoundError(error) || isPreconditionFailedError(error)) {
        return false;
      }
      throw error;
    }
  };

  const commitStaleReservation = async (
    row: ComponentRow
  ): Promise<boolean> => {
    const activeClient = createClient();
    const entity = await getExistingEntity(row.name, row.version);
    if (!isStalePublishingEntity(entity, reservationTtlMs)) {
      return false;
    }

    const committedEntity = {
      ...entity,
      ...getComponentEntity(row, 'committed'),
      createdAt: entity.createdAt,
      updatedAt: Date.now()
    };
    if (row.templateSize === undefined) {
      delete committedEntity.templateSize;
    }
    delete committedEntity.publishToken;

    try {
      await activeClient.updateEntity(committedEntity, 'Replace', {
        etag: entity.etag
      });
      await bumpChangeTokenBestEffort();
      return true;
    } catch (error) {
      if (isPreconditionFailedError(error) || isNotFoundError(error)) {
        return false;
      }
      throw error;
    }
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

      for await (const entity of activeClient.listEntities<any>({
        queryOptions: { filter: `status eq 'committed'` }
      })) {
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
        await activeClient.createEntity(getComponentEntity(row, 'committed'));
        await bumpChangeTokenBestEffort();
      } catch (error) {
        if (isConflictError(error)) {
          if (await commitStaleReservation(row)) {
            return;
          }

          const entity = await getExistingEntity(row.name, row.version);
          throw getEntityAlreadyExistsError(entity, error);
        }
        throw error;
      }
    },

    async reserveVersion(row: ComponentRow): Promise<{ token: string }> {
      const activeClient = createClient();
      const token = randomUUID();

      try {
        await activeClient.createEntity({
          ...getComponentEntity(row, 'publishing'),
          publishToken: token
        });
      } catch (error) {
        if (isConflictError(error)) {
          const entity = await getExistingEntity(row.name, row.version);
          if (await deleteStaleReservation(row.name, row.version, entity)) {
            try {
              await activeClient.createEntity({
                ...getComponentEntity(row, 'publishing'),
                publishToken: token
              });
              return { token };
            } catch (retryError) {
              if (!isConflictError(retryError)) {
                throw retryError;
              }
              const currentEntity = await getExistingEntity(
                row.name,
                row.version
              );
              throw getEntityAlreadyExistsError(currentEntity, retryError);
            }
          }

          throw getEntityAlreadyExistsError(entity, error);
        }
        throw error;
      }

      return { token };
    },

    async commitVersion(
      name: string,
      version: string,
      token: string
    ): Promise<void> {
      const activeClient = createClient();
      const entity = await activeClient.getEntity<any>(name, version);
      if (entity.status !== 'publishing' || entity.publishToken !== token) {
        throw new Error('Component version reservation could not be committed');
      }

      const committedEntity = {
        ...entity,
        status: 'committed',
        updatedAt: Date.now()
      };
      delete committedEntity.publishToken;

      await activeClient.updateEntity(committedEntity, 'Replace', {
        etag: entity.etag
      });
      await bumpChangeTokenBestEffort();
    },

    async abortVersion(
      name: string,
      version: string,
      token: string
    ): Promise<void> {
      const activeClient = createClient();
      const entity = await activeClient.getEntity<any>(name, version);
      if (entity.status !== 'publishing' || entity.publishToken !== token) {
        throw new Error('Component version reservation could not be aborted');
      }

      await activeClient.deleteEntity(name, version, { etag: entity.etag });
    },

    async getChangeToken(): Promise<string> {
      try {
        const cursor = await createClient().getEntity<any>(
          CURSOR_PARTITION_KEY,
          CURSOR_ROW_KEY
        );
        return cursor.etag || String(cursor.updatedAt || '');
      } catch (error) {
        if (isNotFoundError(error)) {
          return '';
        }
        throw error;
      }
    },

    async close(): Promise<void> {
      client = undefined;
    }
  };
}
