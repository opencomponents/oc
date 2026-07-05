export { getFileInfo } from './get-file-info';
export { getMimeType } from './get-mime-type';
export { getNextYear } from './get-next-year';
export * as strings from './strings';

export interface StorageAdapterBaseConfig {
  /**
   * Local folder that contains the compiled OC components ready to be uploaded
   * to the storage provider.
   */
  componentsDir: string;

  /**
   * Public CDN prefix where components will be served from (for example,
   * "https://cdn.myorg.com/"). Adapters use this to build the URLs returned by
   * `getUrl()`.
   */
  path: string;

  /**
   * When set to `true`, enables verbose logging during adapter operations such
   * as upload or removal. Optional.
   */
  verbosity?: boolean;

  /**
   * Time-to-live for the in-memory cache, in milliseconds. Optional.
   */
  refreshInterval?: number;
}

export interface StorageAdapter {
  adapterType: string;
  getFile(filePath: string, force?: boolean): Promise<string>;
  getJson<T = unknown>(filePath: string, force?: boolean): Promise<T>;
  getUrl: (componentName: string, version: string, fileName: string) => string;
  listSubDirectories(dir: string): Promise<string[]>;
  maxConcurrentRequests: number;
  putDir(folderPath: string, filePath: string): Promise<unknown>;
  putFile(
    filePath: string,
    fileName: string,
    isPrivate: boolean,
    client?: unknown
  ): Promise<unknown>;
  putFileContent(
    data: unknown,
    path: string,
    isPrivate: boolean,
    client?: unknown
  ): Promise<unknown>;
  removeDir(folderPath: string): Promise<unknown>;
  removeFile(filePath: string, isPrivate: boolean): Promise<unknown>;
  isValid: () => boolean;
}
