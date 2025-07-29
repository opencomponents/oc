declare module 'oc-client';
declare module 'try-require';
declare module 'basic-auth-connect' {
  import type { IncomingMessage, ServerResponse } from 'node:http';

  // Middleware function type
  type Middleware = (
    req: IncomingMessage,
    res: ServerResponse,
    next: (err?: any) => void
  ) => void;

  // Sync callback function type
  type SyncCallback = (user: string, pass: string) => boolean;

  // Async callback function type
  type AsyncCallback = (
    user: string,
    pass: string,
    fn: (err: any, user?: any) => void
  ) => void;

  // Main function overloads
  function basicAuth(username: string, password: string): Middleware;
  function basicAuth(callback: SyncCallback): Middleware;
  function basicAuth(callback: AsyncCallback): Middleware;

  export = basicAuth;
}

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
  function getPort(
    start: number,
    cb: (err: unknown, data: number) => void
  ): void;

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
