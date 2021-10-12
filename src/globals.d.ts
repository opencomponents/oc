declare module 'oc-client';
declare module 'try-require';
declare module 'basic-auth-connect';

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
  function getPort(cb: Callback): void;
  function getPort(start: number, cb: Callback): void;
  function getPort(start: number, end: number, cb: Callback<number>): void;

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
