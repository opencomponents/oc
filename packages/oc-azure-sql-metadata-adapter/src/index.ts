import { randomUUID } from 'node:crypto';
import sql from 'mssql';
import {
  type ComponentRow,
  type MetadataStatus,
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

export interface AzureSqlMetadataAdapterOptions extends sql.config {
  connectionString?: string;
  manageSchema?: boolean;
  schemaName?: string;
  tableName?: string;
  /**
   * Optional client id of a user-assigned managed identity. Only used when no
   * `password`, `connectionString` or explicit `authentication` is supplied and
   * the adapter falls back to Microsoft Entra ID (`azure-active-directory-default`).
   */
  clientId?: string;
  /** Seconds before an uncommitted publish reservation can be reclaimed. */
  reservationTtlSeconds?: number;
}

type SqlError = Error & { number?: number; code?: string };

const UNIQUE_VIOLATION_NUMBERS = new Set([2627, 2601]);
const DEFAULT_RESERVATION_TTL_SECONDS = 60 * 60;
const VERSION_MAX_LENGTH = 128;

const isValidIdentifier = (value: string): boolean =>
  /^[A-Za-z_][A-Za-z0-9_]*$/.test(value);

const assertIdentifier = (value: string, label: string): string => {
  if (!isValidIdentifier(value)) {
    throw new Error(`${label} must be a valid SQL identifier`);
  }

  return value;
};

const assertVersionLength = (version: string): void => {
  if (version.length > VERSION_MAX_LENGTH) {
    throw new Error(
      `Component version must be ${VERSION_MAX_LENGTH} characters or fewer for Azure SQL metadata storage`
    );
  }
};

const getQualifiedTableName = (schemaName: string, tableName: string): string =>
  `[${assertIdentifier(schemaName, 'schemaName')}].[${assertIdentifier(
    tableName,
    'tableName'
  )}]`;

const getObjectName = (schemaName: string, tableName: string): string =>
  `${assertIdentifier(schemaName, 'schemaName')}.${assertIdentifier(
    tableName,
    'tableName'
  )}`;

type ConnectionOptions = sql.config | string;

const getSqlConfig = (
  options: AzureSqlMetadataAdapterOptions
): ConnectionOptions => {
  const {
    connectionString,
    manageSchema,
    schemaName,
    tableName,
    clientId,
    reservationTtlSeconds,
    ...connectionOptions
  } = options;
  void manageSchema;
  void schemaName;
  void tableName;
  void reservationTtlSeconds;

  if (connectionString) {
    return connectionString;
  }

  // Default to Microsoft Entra ID (managed identity / workload identity / az
  // login / etc) when neither a password nor an explicit authentication mode is
  // configured, so deployments can run without any secret in config.
  if (!connectionOptions.password && !connectionOptions.authentication) {
    connectionOptions.authentication = {
      type: 'azure-active-directory-default',
      options: clientId ? { clientId } : {}
    };
  }

  return connectionOptions;
};

const isUniqueViolation = (error: unknown): boolean => {
  const err = error as SqlError;
  return (
    typeof err?.number === 'number' && UNIQUE_VIOLATION_NUMBERS.has(err.number)
  );
};

const getReservationTtlSeconds = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.max(1, Math.floor(value))
    : DEFAULT_RESERVATION_TTL_SECONDS;

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

const getCreateSchemaSql = (
  qualifiedTableName: string,
  objectName: string
): string => `
IF OBJECT_ID(N'${objectName}', N'U') IS NULL
BEGIN
  CREATE TABLE ${qualifiedTableName} (
    component_name  NVARCHAR(255) NOT NULL,
    version         NVARCHAR(128) NOT NULL,
    publish_date    BIGINT        NOT NULL,
    template_size   BIGINT        NULL,
    status          NVARCHAR(16)  NOT NULL DEFAULT N'committed',
    publish_token   NVARCHAR(64)  NULL,
    created_at      DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at      DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    PRIMARY KEY (component_name, version)
  );
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'ix_oc_components_name'
    AND object_id = OBJECT_ID(N'${objectName}', N'U')
)
BEGIN
  CREATE INDEX ix_oc_components_name ON ${qualifiedTableName} (component_name);
END;
`;

const getVerifySchemaSql = (qualifiedTableName: string): string =>
  `SELECT TOP (0) component_name, version, publish_date, template_size, status, publish_token, created_at, updated_at FROM ${qualifiedTableName};`;

const assertRowsAffected = (
  result: { rowsAffected?: number[] },
  message: string
): void => {
  if ((result.rowsAffected?.[0] ?? 0) === 0) {
    throw new Error(message);
  }
};

const addComponentRowInputs = (
  request: sql.Request,
  row: ComponentRow
): sql.Request => {
  assertVersionLength(row.version);

  return request
    .input('componentName', sql.NVarChar(255), row.name)
    .input('version', sql.NVarChar(VERSION_MAX_LENGTH), row.version)
    .input('publishDate', sql.BigInt, row.publishDate)
    .input('templateSize', sql.BigInt, row.templateSize ?? null);
};

export default function azureSqlMetadataAdapter(
  options?: AzureSqlMetadataAdapterOptions
): MetadataStore {
  const adapterType = 'azure-sql';
  const metadataOptions = options || ({} as AzureSqlMetadataAdapterOptions);
  const manageSchema = metadataOptions.manageSchema !== false;
  const schemaName = metadataOptions.schemaName || 'dbo';
  const tableName = metadataOptions.tableName || 'oc_components';
  const reservationTtlSeconds = getReservationTtlSeconds(
    metadataOptions.reservationTtlSeconds
  );
  const connectionOptions = getSqlConfig(metadataOptions);
  let pool: sql.ConnectionPool | undefined;

  const getTableNames = (): {
    qualifiedTableName: string;
    objectName: string;
  } => ({
    qualifiedTableName: getQualifiedTableName(schemaName, tableName),
    objectName: getObjectName(schemaName, tableName)
  });

  const getPool = async (): Promise<sql.ConnectionPool> => {
    if (pool) return pool;

    pool = await new sql.ConnectionPool(connectionOptions).connect();
    return pool;
  };

  const getExistingVersionStatus = async (
    name: string,
    version: string
  ): Promise<MetadataStatus | undefined> => {
    assertVersionLength(version);
    const { qualifiedTableName } = getTableNames();
    const activePool = await getPool();
    const result = await activePool
      .request()
      .input('componentName', sql.NVarChar(255), name)
      .input('version', sql.NVarChar(VERSION_MAX_LENGTH), version)
      .query<{ status: MetadataStatus }>(`
        SELECT status
        FROM ${qualifiedTableName}
        WHERE component_name = @componentName AND version = @version;
      `);

    return result.recordset[0]?.status;
  };

  const getReserveConflictCode = async (
    name: string,
    version: string
  ): Promise<
    typeof VERSION_ALREADY_EXISTS | typeof VERSION_PUBLISH_IN_PROGRESS
  > =>
    (await getExistingVersionStatus(name, version)) === 'publishing'
      ? VERSION_PUBLISH_IN_PROGRESS
      : VERSION_ALREADY_EXISTS;

  const deleteStaleReservation = async (
    name: string,
    version: string
  ): Promise<boolean> => {
    assertVersionLength(version);
    const { qualifiedTableName } = getTableNames();
    const activePool = await getPool();
    const result = await activePool
      .request()
      .input('componentName', sql.NVarChar(255), name)
      .input('version', sql.NVarChar(VERSION_MAX_LENGTH), version)
      .query(`
        DELETE FROM ${qualifiedTableName}
        WHERE component_name = @componentName
          AND version = @version
          AND status = N'publishing'
          AND updated_at < DATEADD(SECOND, -${reservationTtlSeconds}, SYSUTCDATETIME());
      `);

    return (result.rowsAffected?.[0] ?? 0) > 0;
  };

  const commitStaleReservation = async (
    row: ComponentRow
  ): Promise<boolean> => {
    const { qualifiedTableName } = getTableNames();
    const activePool = await getPool();
    const result = await addComponentRowInputs(
      activePool.request(),
      row
    ).query(`
      UPDATE ${qualifiedTableName}
      SET publish_date = @publishDate,
          template_size = @templateSize,
          status = N'committed',
          publish_token = NULL,
          updated_at = SYSUTCDATETIME()
      WHERE component_name = @componentName
        AND version = @version
        AND status = N'publishing'
        AND updated_at < DATEADD(SECOND, -${reservationTtlSeconds}, SYSUTCDATETIME());
    `);

    return (result.rowsAffected?.[0] ?? 0) > 0;
  };

  const insertCommittedVersion = async (row: ComponentRow): Promise<void> => {
    const { qualifiedTableName } = getTableNames();
    const activePool = await getPool();
    await addComponentRowInputs(activePool.request(), row).query(`
      INSERT INTO ${qualifiedTableName} (component_name, version, publish_date, template_size, status, publish_token)
      VALUES (@componentName, @version, @publishDate, @templateSize, N'committed', NULL);
    `);
  };

  const insertReservation = async (
    row: ComponentRow,
    token: string
  ): Promise<void> => {
    const { qualifiedTableName } = getTableNames();
    const activePool = await getPool();
    await addComponentRowInputs(activePool.request(), row)
      .input('publishToken', sql.NVarChar(64), token)
      .query(`
        INSERT INTO ${qualifiedTableName} (component_name, version, publish_date, template_size, status, publish_token)
        VALUES (@componentName, @version, @publishDate, @templateSize, N'publishing', @publishToken);
      `);
  };

  return {
    adapterType,

    isValid(): boolean {
      return Boolean(
        (metadataOptions.connectionString ||
          (metadataOptions.server && metadataOptions.database)) &&
          isValidIdentifier(schemaName) &&
          isValidIdentifier(tableName)
      );
    },

    async initialise(): Promise<void> {
      const { qualifiedTableName, objectName } = getTableNames();
      const activePool = await getPool();
      await activePool
        .request()
        .query(
          manageSchema
            ? getCreateSchemaSql(qualifiedTableName, objectName)
            : getVerifySchemaSql(qualifiedTableName)
        );
    },

    async getAllComponents(): Promise<ComponentRow[]> {
      const { qualifiedTableName } = getTableNames();
      const activePool = await getPool();
      const result = await activePool.request().query<{
        name: string;
        version: string;
        publishDate: number | string;
        templateSize: number | string | null;
      }>(
        `SELECT component_name AS name, version, publish_date AS publishDate, template_size AS templateSize FROM ${qualifiedTableName} WHERE status = N'committed';`
      );

      return result.recordset.map((row) => {
        const componentRow: ComponentRow = {
          name: row.name,
          version: row.version,
          publishDate: Number(row.publishDate)
        };

        if (row.templateSize !== null) {
          componentRow.templateSize = Number(row.templateSize);
        }

        return componentRow;
      });
    },

    async addVersion(row: ComponentRow): Promise<void> {
      try {
        await insertCommittedVersion(row);
      } catch (error) {
        if (isUniqueViolation(error)) {
          if (await commitStaleReservation(row)) {
            return;
          }

          throw getVersionAlreadyExistsError(
            error,
            await getReserveConflictCode(row.name, row.version)
          );
        }

        throw error;
      }
    },

    async reserveVersion(row: ComponentRow): Promise<{ token: string }> {
      const token = randomUUID();
      try {
        await insertReservation(row, token);
      } catch (error) {
        if (isUniqueViolation(error)) {
          if (await deleteStaleReservation(row.name, row.version)) {
            try {
              await insertReservation(row, token);
              return { token };
            } catch (retryError) {
              if (!isUniqueViolation(retryError)) {
                throw retryError;
              }
            }
          }

          throw getVersionAlreadyExistsError(
            error,
            await getReserveConflictCode(row.name, row.version)
          );
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
      assertVersionLength(version);
      const { qualifiedTableName } = getTableNames();
      const activePool = await getPool();
      const result = await activePool
        .request()
        .input('componentName', sql.NVarChar(255), name)
        .input('version', sql.NVarChar(VERSION_MAX_LENGTH), version)
        .input('publishToken', sql.NVarChar(64), token)
        .query(`
          UPDATE ${qualifiedTableName}
          SET status = N'committed', publish_token = NULL, updated_at = SYSUTCDATETIME()
          WHERE component_name = @componentName AND version = @version AND status = N'publishing' AND publish_token = @publishToken;
        `);
      assertRowsAffected(
        result,
        'Component version reservation could not be committed'
      );
    },

    async abortVersion(
      name: string,
      version: string,
      token: string
    ): Promise<void> {
      assertVersionLength(version);
      const { qualifiedTableName } = getTableNames();
      const activePool = await getPool();
      const result = await activePool
        .request()
        .input('componentName', sql.NVarChar(255), name)
        .input('version', sql.NVarChar(VERSION_MAX_LENGTH), version)
        .input('publishToken', sql.NVarChar(64), token)
        .query(`
          DELETE FROM ${qualifiedTableName}
          WHERE component_name = @componentName AND version = @version AND status = N'publishing' AND publish_token = @publishToken;
        `);
      assertRowsAffected(
        result,
        'Component version reservation could not be aborted'
      );
    },

    async getChangeToken(): Promise<string> {
      const { qualifiedTableName } = getTableNames();
      const activePool = await getPool();
      const result = await activePool.request().query<{
        maxPublishDate: number | string | null;
        total: number | string;
      }>(`
        SELECT MAX(publish_date) AS maxPublishDate, COUNT_BIG(1) AS total
        FROM ${qualifiedTableName}
        WHERE status = N'committed';
      `);
      const row = result.recordset[0];

      return `${row?.total ?? 0}:${row?.maxPublishDate ?? 0}`;
    },

    async close(): Promise<void> {
      const activePool = pool;
      pool = undefined;
      if (activePool) {
        await activePool.close();
      }
    }
  };
}
