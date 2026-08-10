export const VERSION_ALREADY_EXISTS = 'VERSION_ALREADY_EXISTS';
export const VERSION_PUBLISH_IN_PROGRESS = 'VERSION_PUBLISH_IN_PROGRESS';

export type MetadataStatus = 'publishing' | 'committed';

export type ComponentRow = {
  name: string;
  version: string;
  publishDate: number;
  templateSize?: number;
  status?: MetadataStatus;
  publishToken?: string;
};

export interface MetadataStore {
  adapterType: string;
  isValid(): boolean;
  initialise(): Promise<void>;
  getAllComponents(): Promise<ComponentRow[]>;
  addVersion(row: ComponentRow): Promise<void>;
  /**
   * Reserve/commit/abort implement the metadata-mode publish state machine.
   * Adapter factories must be side-effect free; open connections in initialise()
   * or on first operation, because validation may instantiate throwaway stores.
   */
  reserveVersion(row: ComponentRow): Promise<{ token: string }>;
  commitVersion(name: string, version: string, token: string): Promise<void>;
  abortVersion(name: string, version: string, token: string): Promise<void>;
  getChangeToken?(): Promise<string>;
  close?(): Promise<void>;
  removeVersion?(name: string, version: string): Promise<void>;
  changesSince?(cursor: string): Promise<{
    rows: ComponentRow[];
    cursor: string;
  }>;
}

/** A promise- or callback-based metadata store accepted on the 0.x line. */
export type MetadataStoreLike = {
  adapterType: string;
  isValid(): boolean;
  initialise: (...args: any[]) => unknown;
  getAllComponents: (...args: any[]) => unknown;
  addVersion: (...args: any[]) => unknown;
  reserveVersion: (...args: any[]) => unknown;
  commitVersion: (...args: any[]) => unknown;
  abortVersion: (...args: any[]) => unknown;
  getChangeToken?: (...args: any[]) => unknown;
  close?: (...args: any[]) => unknown;
  removeVersion?: (...args: any[]) => unknown;
  changesSince?: (...args: any[]) => unknown;
};

export interface VersionAlreadyExistsError extends Error {
  code: typeof VERSION_ALREADY_EXISTS | typeof VERSION_PUBLISH_IN_PROGRESS;
  cause?: unknown;
}
