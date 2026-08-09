export const VERSION_ALREADY_EXISTS = 'VERSION_ALREADY_EXISTS';
export const VERSION_PUBLISH_IN_PROGRESS = 'VERSION_PUBLISH_IN_PROGRESS';

export type MetadataStatus = 'publishing' | 'committed';

export type MetadataAdapterCallback<T = unknown> = (
  error: unknown,
  value?: T
) => void;

export type MetadataPromiseCallbackMethod<
  Arguments extends unknown[],
  ReturnValue
> = {
  (...arguments_: Arguments): Promise<ReturnValue>;
  (...arguments_: [...Arguments, MetadataAdapterCallback<ReturnValue>]): void;
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
 * Adds the legacy callback form to a promise method without changing how
 * promise callers observe results or errors.
 */
export const withCallbacks = <Arguments extends unknown[], ReturnValue>(
  fn: (...arguments_: Arguments) => Promise<ReturnValue>,
  adapterId = 'metadata'
): MetadataPromiseCallbackMethod<Arguments, ReturnValue> =>
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
      (callback as MetadataAdapterCallback<ReturnValue>)(error, value);
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
  } as MetadataPromiseCallbackMethod<Arguments, ReturnValue>;

export type ComponentRow = {
  name: string;
  version: string;
  publishDate: number;
  templateSize?: number;
  status?: MetadataStatus;
  publishToken?: string;
};

export interface PromiseMetadataStore {
  adapterApi?: 'promise';
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

export type MetadataStoreWithCallbacks = Omit<
  PromiseMetadataStore,
  | 'initialise'
  | 'getAllComponents'
  | 'addVersion'
  | 'reserveVersion'
  | 'commitVersion'
  | 'abortVersion'
  | 'getChangeToken'
  | 'close'
  | 'removeVersion'
  | 'changesSince'
> & {
  initialise: {
    (): Promise<void>;
    (callback: MetadataAdapterCallback<void>): void;
  };
  getAllComponents: {
    (): Promise<ComponentRow[]>;
    (callback: MetadataAdapterCallback<ComponentRow[]>): void;
  };
  addVersion: {
    (row: ComponentRow): Promise<void>;
    (row: ComponentRow, callback: MetadataAdapterCallback<void>): void;
  };
  reserveVersion: {
    (row: ComponentRow): Promise<{ token: string }>;
    (
      row: ComponentRow,
      callback: MetadataAdapterCallback<{ token: string }>
    ): void;
  };
  commitVersion: {
    (name: string, version: string, token: string): Promise<void>;
    (
      name: string,
      version: string,
      token: string,
      callback: MetadataAdapterCallback<void>
    ): void;
  };
  abortVersion: {
    (name: string, version: string, token: string): Promise<void>;
    (
      name: string,
      version: string,
      token: string,
      callback: MetadataAdapterCallback<void>
    ): void;
  };
  getChangeToken?: {
    (): Promise<string>;
    (callback: MetadataAdapterCallback<string>): void;
  };
  close?: {
    (): Promise<void>;
    (callback: MetadataAdapterCallback<void>): void;
  };
  removeVersion?: {
    (name: string, version: string): Promise<void>;
    (
      name: string,
      version: string,
      callback: MetadataAdapterCallback<void>
    ): void;
  };
  changesSince?: {
    (cursor: string): Promise<{ rows: ComponentRow[]; cursor: string }>;
    (
      cursor: string,
      callback: MetadataAdapterCallback<{
        rows: ComponentRow[];
        cursor: string;
      }>
    ): void;
  };
};

export type MetadataStore = PromiseMetadataStore;

export interface LegacyMetadataStore {
  adapterApi?: 'callback';
  adapterType: string;
  isValid(): boolean;
  initialise: (callback: MetadataAdapterCallback<void>) => void;
  getAllComponents: (callback: MetadataAdapterCallback<ComponentRow[]>) => void;
  addVersion: (
    row: ComponentRow,
    callback: MetadataAdapterCallback<void>
  ) => void;
  reserveVersion: (
    row: ComponentRow,
    callback: MetadataAdapterCallback<{ token: string }>
  ) => void;
  commitVersion: (
    name: string,
    version: string,
    token: string,
    callback: MetadataAdapterCallback<void>
  ) => void;
  abortVersion: (
    name: string,
    version: string,
    token: string,
    callback: MetadataAdapterCallback<void>
  ) => void;
  getChangeToken?: (callback: MetadataAdapterCallback<string>) => void;
  close?: (callback: MetadataAdapterCallback<void>) => void;
  removeVersion?: (
    name: string,
    version: string,
    callback: MetadataAdapterCallback<void>
  ) => void;
  changesSince?: (
    cursor: string,
    callback: MetadataAdapterCallback<{ rows: ComponentRow[]; cursor: string }>
  ) => void;
}

export type MetadataStoreInput = PromiseMetadataStore | LegacyMetadataStore;

export interface VersionAlreadyExistsError extends Error {
  code: typeof VERSION_ALREADY_EXISTS | typeof VERSION_PUBLISH_IN_PROGRESS;
  cause?: unknown;
}
