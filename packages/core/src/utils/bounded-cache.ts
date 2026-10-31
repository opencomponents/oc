import { LRUCache } from 'lru-cache';

export default class BoundedCache {
  private readonly cache: LRUCache<string, NonNullable<unknown>>;

  constructor(maxEntries: number) {
    if (!Number.isInteger(maxEntries) || maxEntries <= 0) {
      throw new Error('Cache capacity must be a positive integer');
    }
    this.cache = new LRUCache({ max: maxEntries });
  }

  get<T>(namespace: string, key: string): T | undefined {
    return this.cache.get(this.toKey(namespace, key)) as T | undefined;
  }

  set<T>(namespace: string, key: string, value: T): void {
    this.cache.set(this.toKey(namespace, key), value as NonNullable<unknown>);
  }

  delete(namespace: string, key: string): boolean {
    return this.cache.delete(this.toKey(namespace, key));
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }

  private toKey(namespace: string, key: string): string {
    return JSON.stringify([namespace, key]);
  }
}
