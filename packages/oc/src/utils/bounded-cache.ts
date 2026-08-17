type CacheEntry = {
  namespace: string;
  key: string;
  value: unknown;
};

export default class BoundedCache {
  private readonly namespaces = new Map<string, Map<string, CacheEntry>>();
  private readonly entries = new Map<CacheEntry, true>();

  constructor(private readonly maxEntries: number) {
    if (!Number.isInteger(maxEntries) || maxEntries <= 0) {
      throw new Error('Cache capacity must be a positive integer');
    }
  }

  get<T>(namespace: string, key: string): T | undefined {
    const entry = this.namespaces.get(namespace)?.get(key);
    if (!entry) return undefined;

    this.entries.delete(entry);
    this.entries.set(entry, true);
    return entry.value as T;
  }

  set<T>(namespace: string, key: string, value: T): void {
    const namespaceEntries = this.namespaces.get(namespace);
    const existing = namespaceEntries?.get(key);
    if (existing) {
      existing.value = value;
      this.entries.delete(existing);
      this.entries.set(existing, true);
      return;
    }

    const entry = { namespace, key, value };
    if (namespaceEntries) {
      namespaceEntries.set(key, entry);
    } else {
      this.namespaces.set(namespace, new Map([[key, entry]]));
    }
    this.entries.set(entry, true);

    if (this.entries.size > this.maxEntries) {
      const leastRecentlyUsed = this.entries.keys().next().value;
      if (leastRecentlyUsed) this.remove(leastRecentlyUsed);
    }
  }

  delete(namespace: string, key: string): boolean {
    const entry = this.namespaces.get(namespace)?.get(key);
    if (!entry) return false;
    this.remove(entry);
    return true;
  }

  clear(): void {
    this.namespaces.clear();
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }

  private remove(entry: CacheEntry): void {
    const namespaceEntries = this.namespaces.get(entry.namespace);
    namespaceEntries?.delete(entry.key);
    if (namespaceEntries?.size === 0) this.namespaces.delete(entry.namespace);
    this.entries.delete(entry);
  }
}
