import {
  VERSION_ALREADY_EXISTS,
  VERSION_PUBLISH_IN_PROGRESS
} from 'oc-metadata-adapters-utils';
import type { StorageAdapter } from 'oc-storage-adapters-utils';
import type {
  Component,
  ComponentRow,
  ComponentsDetails,
  MetadataStore
} from '../../types';
import pLimit from '../../utils/pLimit';
import {
  getComponentsDetailsFromRows,
  getComponentsListFromRows
} from './metadata-index';

export interface MetadataMigrationResult {
  scanned: number;
  inserted: number;
  skipped: number;
}

export interface MetadataExportResult {
  exported: number;
  files: string[];
}

const isNotFoundError = (err: any, code: string) =>
  err === code || err?.code === code;

const getTemplateSize = (component: Component): number | undefined =>
  component.oc.files.template.size;

export const getComponentRowsFromComponentsDetails = (
  componentsDetails: ComponentsDetails
): ComponentRow[] => {
  const rows: ComponentRow[] = [];

  for (const [name, versions] of Object.entries(
    componentsDetails.components || {}
  )) {
    for (const [version, details] of Object.entries(versions)) {
      const row: ComponentRow = {
        name,
        version,
        publishDate: details.publishDate
      };

      if (details.templateSize !== undefined) {
        row.templateSize = details.templateSize;
      }

      rows.push(row);
    }
  }

  return rows;
};

export const backfillMetadataRows = async (
  metadataStore: MetadataStore,
  rows: ComponentRow[]
): Promise<MetadataMigrationResult> => {
  const result: MetadataMigrationResult = {
    scanned: rows.length,
    inserted: 0,
    skipped: 0
  };

  for (const row of rows) {
    try {
      await metadataStore.addVersion(row);
      result.inserted += 1;
    } catch (err: any) {
      if (
        err?.code === VERSION_ALREADY_EXISTS ||
        err?.code === VERSION_PUBLISH_IN_PROGRESS
      ) {
        result.skipped += 1;
      } else {
        throw err;
      }
    }
  }

  return result;
};

export const backfillMetadataFromComponentsDetails = async (
  metadataStore: MetadataStore,
  componentsDetails: ComponentsDetails
): Promise<MetadataMigrationResult> =>
  backfillMetadataRows(
    metadataStore,
    getComponentRowsFromComponentsDetails(componentsDetails)
  );

export const getComponentRowsFromStorageDirectories = async (options: {
  cdn: StorageAdapter;
  componentsDir: string;
}): Promise<ComponentRow[]> => {
  let components: string[];
  try {
    components = await options.cdn.listSubDirectories(options.componentsDir);
  } catch (err) {
    if (isNotFoundError(err, 'dir_not_found')) {
      return [];
    }
    throw err;
  }

  const maxConcurrentRequests = options.cdn.maxConcurrentRequests || 10;
  const componentLimit = pLimit(maxConcurrentRequests);
  const packageLimit = pLimit(maxConcurrentRequests);
  const rowsByComponent = await Promise.all(
    components.map((name) =>
      componentLimit(async () => {
        const versions = await options.cdn.listSubDirectories(
          `${options.componentsDir}/${name}`
        );
        const rows = await Promise.all(
          versions.map((version) =>
            packageLimit(async (): Promise<ComponentRow | null> => {
              try {
                const component = await options.cdn.getJson<Component>(
                  `${options.componentsDir}/${name}/${version}/package.json`,
                  true
                );
                const row: ComponentRow = {
                  name,
                  version,
                  publishDate: component.oc.date || 0
                };
                const templateSize = getTemplateSize(component);
                if (templateSize !== undefined) {
                  row.templateSize = templateSize;
                }
                return row;
              } catch (err) {
                if (isNotFoundError(err, 'file_not_found')) {
                  return null;
                }
                throw err;
              }
            })
          )
        );

        return rows.filter((row): row is ComponentRow => row !== null);
      })
    )
  );

  return rowsByComponent.flat();
};

export const backfillMetadataFromStorageDirectories = async (options: {
  metadataStore: MetadataStore;
  cdn: StorageAdapter;
  componentsDir: string;
}): Promise<MetadataMigrationResult> =>
  backfillMetadataRows(
    options.metadataStore,
    await getComponentRowsFromStorageDirectories(options)
  );

export const reconcileMetadataFromStorage =
  backfillMetadataFromStorageDirectories;

export const exportLegacyMetadataFiles = async (options: {
  metadataStore: MetadataStore;
  cdn: StorageAdapter;
  componentsDir: string;
}): Promise<MetadataExportResult> => {
  const rows = await options.metadataStore.getAllComponents();
  const componentsListPath = `${options.componentsDir}/components.json`;
  const componentsDetailsPath = `${options.componentsDir}/components-details.json`;
  await Promise.all([
    options.cdn.putFileContent(
      JSON.stringify(getComponentsListFromRows(rows)),
      componentsListPath,
      true
    ),
    options.cdn.putFileContent(
      JSON.stringify(getComponentsDetailsFromRows(rows)),
      componentsDetailsPath,
      true
    )
  ]);

  return {
    exported: rows.length,
    files: [componentsListPath, componentsDetailsPath]
  };
};

export const backfillMetadataFromStorageDetails = async (options: {
  metadataStore: MetadataStore;
  cdn: StorageAdapter;
  componentsDir: string;
}): Promise<MetadataMigrationResult> => {
  try {
    const componentsDetails = await options.cdn.getJson<ComponentsDetails>(
      `${options.componentsDir}/components-details.json`,
      true
    );

    return backfillMetadataFromComponentsDetails(
      options.metadataStore,
      componentsDetails
    );
  } catch (err) {
    if (isNotFoundError(err, 'file_not_found')) {
      return backfillMetadataFromStorageDirectories(options);
    }
    throw err;
  }
};
