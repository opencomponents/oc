import semver from 'semver';
import type {
  Component,
  ComponentDetail,
  ComponentRow,
  ComponentsDetails,
  ComponentsList,
  MetadataStore
} from '../../types';

// Derive `lastEdit` from the data itself (the most recent publish) rather than
// the wall-clock time the snapshot happened to be built. This keeps the value
// semantically meaningful (it only advances when something is actually
// published) so the poll's `data.lastEdit > cached.lastEdit` guard works and
// the exported legacy `components.json` reflects the real last edit.
const getLastEditFromRows = (rows: ComponentRow[]): number =>
  rows.reduce((max, row) => (row.publishDate > max ? row.publishDate : max), 0);

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
    lastEdit: getLastEditFromRows(rows),
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
    lastEdit: getLastEditFromRows(rows),
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

const FORCED_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

const buildSnapshot = (rows: ComponentRow[]): MetadataSnapshot => ({
  componentsList: getComponentsListFromRows(rows),
  componentsDetails: getComponentsDetailsFromRows(rows)
});

export const createMetadataIndex = (
  metadataStore: MetadataStore
): MetadataIndex => {
  let snapshot: MetadataSnapshot | undefined;
  let lastChangeToken: string | undefined;
  let lastForcedRefreshAt = 0;

  const refresh = async (): Promise<MetadataSnapshot> => {
    const changeToken = metadataStore.getChangeToken
      ? await metadataStore.getChangeToken()
      : undefined;
    const now = Date.now();

    if (
      snapshot &&
      changeToken !== undefined &&
      changeToken === lastChangeToken &&
      now - lastForcedRefreshAt < FORCED_REFRESH_INTERVAL_MS
    ) {
      return snapshot;
    }

    const rows = await metadataStore.getAllComponents();
    snapshot = buildSnapshot(rows);
    lastChangeToken = changeToken;
    lastForcedRefreshAt = now;

    return snapshot;
  };

  const add = (row: ComponentRow): MetadataSnapshot => {
    // No snapshot yet: build one from the single row.
    if (!snapshot) {
      snapshot = buildSnapshot([row]);

      return snapshot;
    }

    const { name, version } = row;
    const prevList = snapshot.componentsList.components;
    const prevDetails = snapshot.componentsDetails.components;

    // Already present: keep the snapshot unchanged (mirrors the unique-constraint
    // guarantee, so a duplicate publish doesn't disturb the cache).
    if (prevDetails[name]?.[version]) {
      return snapshot;
    }

    // Only the published component is rebuilt; every other component entry is
    // shared by reference, so the cost is O(versions-of-this-component) rather
    // than O(registry). New container objects are produced (rather than mutating
    // in place) so in-flight readers keep a consistent view of the old snapshot.
    const versions = [...(prevList[name] ?? []), version].sort(semver.compare);

    const detail: ComponentDetail = {
      ...(prevDetails[name] ?? ({} as ComponentDetail)),
      [version]: { publishDate: row.publishDate }
    };
    if (row.templateSize !== undefined) {
      detail[version].templateSize = row.templateSize;
    }

    const lastEdit = Math.max(
      snapshot.componentsList.lastEdit,
      row.publishDate
    );

    snapshot = {
      componentsList: {
        lastEdit,
        components: { ...prevList, [name]: versions }
      },
      componentsDetails: {
        lastEdit,
        components: { ...prevDetails, [name]: detail }
      }
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
