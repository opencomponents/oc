export { getFileInfo } from './get-file-info';
export { getMimeType } from './get-mime-type';
export { getNextYear } from './get-next-year';
export * as strings from './strings';

export type AdapterApi = 'promise' | 'callback';

export type AdapterCallback<T = unknown> = (error: unknown, value?: T) => void;

export type PromiseCallbackMethod<Arguments extends unknown[], ReturnValue> = {
  (...arguments_: Arguments): Promise<ReturnValue>;
  (...arguments_: [...Arguments, AdapterCallback<ReturnValue>]): void;
};

const warnedCallbackAdapters = new Set<string>();

const warnAboutCallbacks = (adapterId: string): void => {
  if (warnedCallbackAdapters.has(adapterId)) {
    return;
  }

  warnedCallbackAdapters.add(adapterId);
  const nodeProcess = (
    globalThis as typeof globalThis & {
      process?: { emitWarning: (warning: string, type: string) => void };
    }
  ).process;
  nodeProcess?.emitWarning(
    `Callback-based ${adapterId} adapter methods are deprecated and will be removed in OpenComponents v1 - use the returned promises instead.`,
    'DeprecationWarning'
  );
};

/**
 * Adds the legacy error-first callback form without changing the promise form.
 * The returned function is deliberately one-shot: a misbehaving promise
 * implementation cannot invoke a callback twice through this compatibility
 * layer.
 */
export const withCallbacks = <Arguments extends unknown[], ReturnValue>(
  fn: (...arguments_: Arguments) => Promise<ReturnValue>,
  adapterId = 'storage'
): PromiseCallbackMethod<Arguments, ReturnValue> =>
  function adapterMethod(this: unknown, ...arguments_: unknown[]) {
    const callback = arguments_[arguments_.length - 1];

    if (typeof callback !== 'function') {
      return Promise.resolve().then(() => fn(...(arguments_ as Arguments)));
    }

    warnAboutCallbacks(adapterId);
    arguments_.pop();
    let settled = false;
    const finish = (error: unknown, value?: ReturnValue) => {
      if (settled) {
        return;
      }
      settled = true;
      (callback as AdapterCallback<ReturnValue>)(error, value);
    };

    try {
      fn(...(arguments_ as Arguments)).then(
        (value) => finish(null, value),
        (error) => finish(error)
      );
    } catch (error) {
      finish(error);
    }

    return undefined;
  } as PromiseCallbackMethod<Arguments, ReturnValue>;

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

export interface PromiseStorageAdapter {
  adapterApi?: 'promise';
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

export type StorageAdapterWithCallbacks = Omit<
  PromiseStorageAdapter,
  | 'getFile'
  | 'getJson'
  | 'listSubDirectories'
  | 'putDir'
  | 'putFile'
  | 'putFileContent'
  | 'removeDir'
  | 'removeFile'
> & {
  getFile: {
    (filePath: string, force?: boolean): Promise<string>;
    (filePath: string, callback: AdapterCallback<string>): void;
    (filePath: string, force: boolean, callback: AdapterCallback<string>): void;
  };
  getJson: {
    <T = unknown>(filePath: string, force?: boolean): Promise<T>;
    <T = unknown>(filePath: string, callback: AdapterCallback<T>): void;
    <T = unknown>(
      filePath: string,
      force: boolean,
      callback: AdapterCallback<T>
    ): void;
  };
  listSubDirectories: {
    (dir: string): Promise<string[]>;
    (dir: string, callback: AdapterCallback<string[]>): void;
  };
  putDir: {
    (folderPath: string, filePath: string): Promise<unknown>;
    (
      folderPath: string,
      filePath: string,
      callback: AdapterCallback<unknown>
    ): void;
  };
  putFile: {
    (
      filePath: string,
      fileName: string,
      isPrivate: boolean,
      client?: unknown
    ): Promise<unknown>;
    (
      filePath: string,
      fileName: string,
      isPrivate: boolean,
      callback: AdapterCallback<unknown>
    ): void;
    (
      filePath: string,
      fileName: string,
      isPrivate: boolean,
      client: unknown,
      callback: AdapterCallback<unknown>
    ): void;
  };
  putFileContent: {
    (
      data: unknown,
      path: string,
      isPrivate: boolean,
      client?: unknown
    ): Promise<unknown>;
    (
      data: unknown,
      path: string,
      isPrivate: boolean,
      callback: AdapterCallback<unknown>
    ): void;
    (
      data: unknown,
      path: string,
      isPrivate: boolean,
      client: unknown,
      callback: AdapterCallback<unknown>
    ): void;
  };
  removeDir: {
    (folderPath: string): Promise<unknown>;
    (folderPath: string, callback: AdapterCallback<unknown>): void;
  };
  removeFile: {
    (filePath: string, isPrivate: boolean): Promise<unknown>;
    (
      filePath: string,
      isPrivate: boolean,
      callback: AdapterCallback<unknown>
    ): void;
  };
};

export type StorageAdapter = PromiseStorageAdapter;

export interface LegacyStorageAdapter {
  adapterApi?: 'callback';
  adapterType: string;
  getFile: {
    (filePath: string, callback: AdapterCallback<string>): void;
    (filePath: string, force: boolean, callback: AdapterCallback<string>): void;
  };
  getJson: {
    <T = unknown>(filePath: string, callback: AdapterCallback<T>): void;
    <T = unknown>(
      filePath: string,
      force: boolean,
      callback: AdapterCallback<T>
    ): void;
  };
  getUrl: (componentName: string, version: string, fileName: string) => string;
  listSubDirectories: (
    dir: string,
    callback: AdapterCallback<string[]>
  ) => void;
  maxConcurrentRequests: number;
  putDir: (
    folderPath: string,
    filePath: string,
    callback: AdapterCallback<unknown>
  ) => void;
  putFile: {
    (
      filePath: string,
      fileName: string,
      isPrivate: boolean,
      callback: AdapterCallback<unknown>
    ): void;
    (
      filePath: string,
      fileName: string,
      isPrivate: boolean,
      client: unknown,
      callback: AdapterCallback<unknown>
    ): void;
  };
  putFileContent: {
    (
      data: unknown,
      path: string,
      isPrivate: boolean,
      callback: AdapterCallback<unknown>
    ): void;
    (
      data: unknown,
      path: string,
      isPrivate: boolean,
      client: unknown,
      callback: AdapterCallback<unknown>
    ): void;
  };
  removeDir?: (folderPath: string, callback: AdapterCallback<unknown>) => void;
  removeFile?: (
    filePath: string,
    isPrivate: boolean,
    callback: AdapterCallback<unknown>
  ) => void;
  isValid: () => boolean;
}

export type StorageAdapterInput = PromiseStorageAdapter | LegacyStorageAdapter;
