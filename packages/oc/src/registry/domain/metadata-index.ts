import getUnixUTCTimestamp from 'oc-get-unix-utc-timestamp';
import semver from 'semver';
import type {
  Component,
  ComponentDetail,
  ComponentRow,
  ComponentsDetails,
  ComponentsList,
  MetadataStore
} from '../../types';

export const getComponentsListFromRows = (
  rows: ComponentRow[]
): ComponentsList => {
  const components: ComponentsList['components'] = {};

  for (const row of rows) {
    const versions = components[row.name] || [];
    versions.push(row.version);
    components[row.name] = versions;
  }

  for (const versions of Object.values(components)) {
    versions.sort(semver.compare);
  }

  return {
    lastEdit: getUnixUTCTimestamp(),
    components
  };
};

export const getComponentsDetailsFromRows = (
  rows: ComponentRow[]
): ComponentsDetails => {
  const components: ComponentsDetails['components'] = {};

  for (const row of rows) {
    const componentDetails = components[row.name] || ({} as ComponentDetail);
    componentDetails[row.version] = { publishDate: row.publishDate };
    if (row.templateSize !== undefined) {
      componentDetails[row.version].templateSize = row.templateSize;
    }
    components[row.name] = componentDetails;
  }

  return {
    lastEdit: getUnixUTCTimestamp(),
    components
  };
};

export const getComponentRow = (
  name: string,
  version: string,
  component: Component
): ComponentRow => ({
  name,
  version,
  publishDate: component.oc.date || 0,
  templateSize: component.oc.files.template.size
});

export interface MetadataSnapshot {
  componentsList: ComponentsList;
  componentsDetails: ComponentsDetails;
}

export interface MetadataIndex {
  get(): MetadataSnapshot | undefined;
  add(row: ComponentRow): MetadataSnapshot;
  refresh(): Promise<MetadataSnapshot>;
  getOrRefresh(): Promise<MetadataSnapshot>;
}

export const createMetadataIndex = (
  metadataStore: MetadataStore
): MetadataIndex => {
  let snapshot: MetadataSnapshot | undefined;

  const refresh = async (): Promise<MetadataSnapshot> => {
    const rows = await metadataStore.getAllComponents();
    snapshot = {
      componentsList: getComponentsListFromRows(rows),
      componentsDetails: getComponentsDetailsFromRows(rows)
    };

    return snapshot;
  };

  const add = (row: ComponentRow): MetadataSnapshot => {
    const rows: ComponentRow[] = snapshot
      ? Object.entries(snapshot.componentsDetails.components).flatMap(
          ([name, versions]) =>
            Object.entries(versions).map(([version, details]) => ({
              name,
              version,
              publishDate: details.publishDate,
              templateSize: details.templateSize
            }))
        )
      : [];

    if (
      !rows.some(
        ({ name, version }) => name === row.name && version === row.version
      )
    ) {
      rows.push(row);
    }

    snapshot = {
      componentsList: getComponentsListFromRows(rows),
      componentsDetails: getComponentsDetailsFromRows(rows)
    };

    return snapshot;
  };

  return {
    get: () => snapshot,
    add,
    refresh,
    getOrRefresh: () => (snapshot ? Promise.resolve(snapshot) : refresh())
  };
};
