import sql from 'mssql';
import {
  type ComponentRow,
  type MetadataStore,
  VERSION_ALREADY_EXISTS,
  type VersionAlreadyExistsError
} from 'oc-metadata-adapters-utils';

export type { ComponentRow, MetadataStore } from 'oc-metadata-adapters-utils';
export { VERSION_ALREADY_EXISTS } from 'oc-metadata-adapters-utils';

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
}

type SqlError = Error & { number?: number; code?: string };

const UNIQUE_VIOLATION_NUMBERS = new Set([2627, 2601]);

const isValidIdentifier = (value: string): boolean =>
  /^[A-Za-z_][A-Za-z0-9_]*$/.test(value);

const assertIdentifier = (value: string, label: string): string => {
  if (!isValidIdentifier(value)) {
    throw new Error(`${label} must be a valid SQL identifier`);
  }

  return value;
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
    ...connectionOptions
  } = options;
  void manageSchema;
  void schemaName;
  void tableName;

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

const getCreateSchemaSql = (
  qualifiedTableName: string,
  objectName: string
): string => `
IF OBJECT_ID(N'${objectName}', N'U') IS NULL
BEGIN
  CREATE TABLE ${qualifiedTableName} (
    component_name  NVARCHAR(255) NOT NULL,
    version         NVARCHAR(64)  NOT NULL,
    publish_date    BIGINT        NOT NULL,
    template_size   BIGINT        NULL,
    created_at      DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
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
  `SELECT TOP (0) component_name, version, publish_date, template_size, created_at FROM ${qualifiedTableName};`;

export default function azureSqlMetadataAdapter(
  options?: AzureSqlMetadataAdapterOptions
): MetadataStore {
  const adapterType = 'azure-sql';
  const metadataOptions = options || ({} as AzureSqlMetadataAdapterOptions);
  const manageSchema = metadataOptions.manageSchema !== false;
  const schemaName = metadataOptions.schemaName || 'dbo';
  const tableName = metadataOptions.tableName || 'oc_components';
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
        `SELECT component_name AS name, version, publish_date AS publishDate, template_size AS templateSize FROM ${qualifiedTableName};`
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
      const { qualifiedTableName } = getTableNames();
      const activePool = await getPool();
      try {
        await activePool
          .request()
          .input('componentName', sql.NVarChar(255), row.name)
          .input('version', sql.NVarChar(64), row.version)
          .input('publishDate', sql.BigInt, row.publishDate)
          .input('templateSize', sql.BigInt, row.templateSize ?? null)
          .query(`
            INSERT INTO ${qualifiedTableName} (component_name, version, publish_date, template_size)
            VALUES (@componentName, @version, @publishDate, @templateSize);
          `);
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw getVersionAlreadyExistsError(error);
        }

        throw error;
      }
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
