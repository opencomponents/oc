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
  reserveVersion(row: ComponentRow): Promise<{ token: string }>;
  commitVersion(name: string, version: string, token: string): Promise<void>;
  abortVersion(name: string, version: string, token: string): Promise<void>;
  close?(): Promise<void>;
  removeVersion?(name: string, version: string): Promise<void>;
  changesSince?(cursor: string): Promise<{
    rows: ComponentRow[];
    cursor: string;
  }>;
}

export interface VersionAlreadyExistsError extends Error {
  code: typeof VERSION_ALREADY_EXISTS | typeof VERSION_PUBLISH_IN_PROGRESS;
  cause?: unknown;
}
