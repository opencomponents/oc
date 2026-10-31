// Shared domain primitives, types and utilities for the @oc-framework
// packages. This package must stay free of heavy runtime dependencies
// (no express, no CLI tooling) so both the registry and the CLI can use it.

export type * from './http-server-types';
export { default as getMetadataAdapterOptions } from './metadata-adapter-options';
export type { MetadataIndex, MetadataSnapshot } from './metadata-index';
export {
  createMetadataIndex,
  getComponentRow,
  getComponentsDetailsFromRows,
  getComponentsListFromRows
} from './metadata-index';
export type {
  MetadataExportResult,
  MetadataMigrationResult
} from './metadata-migration';
export {
  backfillMetadataFromComponentsDetails,
  backfillMetadataFromStorageDetails,
  backfillMetadataRows,
  exportLegacyMetadataFiles,
  getComponentRowsFromComponentsDetails,
  getComponentRowsFromStorageDirectories,
  reconcileMetadataFromStorage
} from './metadata-migration';
export type { OpenComponentsConfig } from './oc-config';
export { getOcConfig, setOcConfig } from './oc-config';
export { default as strings } from './resources';
export { default as settings } from './resources/settings';
export {
  default as getPromiseBasedAdapter,
  isPrivateComponentFile
} from './storage-adapter';
export type * from './types';
export {
  component,
  componentInfo,
  componentPreview,
  queryString
} from './url-builder';
export { default as BoundedCache } from './utils/bounded-cache';
export { default as cleanRequire } from './utils/clean-require';
export { default as colors, green, yellow } from './utils/colors';
export { default as dateStringify } from './utils/date-stringify';
export { default as deprecate } from './utils/deprecate';
export { default as errorToString } from './utils/error-to-string';
export { default as isTemplateLegacy } from './utils/is-template-legacy';
export { default as isTemplateValid } from './utils/is-template-valid';
export { default as moduleExists } from './utils/module-exists';
export {
  init,
  installDependencies,
  installDependency
} from './utils/npm-utils';
export type { LimitFunction } from './utils/pLimit';
export { default as pLimit } from './utils/pLimit';
export { default as put } from './utils/put';
export { default as stripVersion } from './utils/strip-version';

export { validateComponentName, validateVersion } from './validate';
