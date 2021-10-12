declare module 'oc-client';
declare module 'try-require';
declare module 'basic-auth-connect';

declare module 'universalify' {
  export function fromCallback<
    Arguments extends readonly unknown[],
    ErrorValue,
    ReturnValue
  >(
    fn: (
      ...arguments_: [
        ...Arguments,
        (error: ErrorValue, value: ReturnValue) => void
      ]
    ) => void
  ): {
    (...arguments_: Arguments): Promise<ReturnValue>;
    (
      ...arguments_: [
        ...Arguments,
        (error: ErrorValue, value: ReturnValue) => void
      ]
    ): void;
  };

  export function fromPromise<
    Arguments extends readonly unknown[],
    ReturnValue
  >(
    fn: (...arguments_: [...Arguments]) => Promise<ReturnValue>
  ): {
    (...arguments_: Arguments): Promise<ReturnValue>;
    (
      ...arguments_: [
        ...Arguments,
        (error: unknown, value: ReturnValue) => void
      ]
    ): void;
  };
}

declare module 'semver-extra' {
  interface SemverExtra {
    max(versions: string[]): string;
    maxStable(versions: string[]): string;
    maxPrerelase(versions: string[], preRelease?: string): string;
  }

  const semverExtra: SemverExtra;

  export = semverExtra;
}

declare module 'require-package-name' {
  function requirePackageName(name: string): string;

  export = requirePackageName;
}
declare module 'getport' {
  function getPort(start: number, cb: Callback): void;

  export = getPort;
}

declare module 'nice-cache' {
  class Cache {
    constructor(opt: { refreshInterval?: number; verbose?: boolean });

    get(type: string, key: string): any;
    set(type: string, key: string, data: unknown): void;
  }

  export = Cache;
}

declare module 'minimal-request' {
  function request<T>(
    opts: {
      method?: string;
      body?: unknown;
      url: string;
      headers?: Dictionary<string | null | undefined | string[]>;
      json?: boolean;
    },
    cb: (
      err: Error | number | null,
      body: T,
      details: {
        response: {
          headers: Dictionary<string>;
        };
      }
    ) => void
  ): void;

  const request: Request;

  export = request;
}

declare type Callback<T = undefined, E = Error> = (
  err: E | null,
  data: T
) => void;

declare type Dictionary<T> = Record<string, T>;
