declare module 'nice-cache' {
  class Cache {
    constructor(opt: { refreshInterval?: number; verbose?: boolean });

    get(type: string, key: string): any;
    set(type: string, key: string, data: unknown): void;
    sub(
      type: string,
      key: string,
      subscriber: (...args: unknown[]) => void
    ): void;
  }

  export = Cache;
}
