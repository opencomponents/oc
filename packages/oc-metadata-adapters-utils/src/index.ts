export const VERSION_ALREADY_EXISTS = 'VERSION_ALREADY_EXISTS';

export type ComponentRow = {
  name: string;
  version: string;
  publishDate: number;
  templateSize?: number;
};

export interface MetadataStore {
  adapterType: string;
  isValid(): boolean;
  initialise(): Promise<void>;
  getAllComponents(): Promise<ComponentRow[]>;
  addVersion(row: ComponentRow): Promise<void>;
  close?(): Promise<void>;
  removeVersion?(name: string, version: string): Promise<void>;
  changesSince?(cursor: string): Promise<{
    rows: ComponentRow[];
    cursor: string;
  }>;
}

export interface VersionAlreadyExistsError extends Error {
  code: typeof VERSION_ALREADY_EXISTS;
  cause?: unknown;
}
