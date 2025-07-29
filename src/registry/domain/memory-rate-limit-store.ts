import { LRUCache } from 'lru-cache';
import type { RateLimitStore } from '../../types';

interface RateLimitEntry {
  hits: number;
  resetTime: number;
}

export default class MemoryRateLimitStore implements RateLimitStore {
  private store: LRUCache<string, RateLimitEntry>;

  constructor(maxSize: number = 1000) {
    this.store = new LRUCache({
      max: maxSize,
      // TTL is handled manually in our increment logic
      ttl: 0,
      // Don't allow stale items
      allowStale: false,
      // Update age on access to maintain LRU behavior
      updateAgeOnGet: true,
      // Clean up expired entries when they're accessed
      dispose: (_value, _key) => {
        // Optional: log when entries are disposed
      }
    });
  }

  async increment(
    key: string,
    windowMs: number
  ): Promise<{
    totalHits: number;
    resetTime: Date;
  }> {
    const now = Date.now();
    const resetTime = new Date(now + windowMs);

    const existing = this.store.get(key);

    if (!existing || existing.resetTime < now) {
      // New entry or expired entry
      const entry: RateLimitEntry = {
        hits: 1,
        resetTime: now + windowMs
      };
      this.store.set(key, entry);
      return {
        totalHits: 1,
        resetTime
      };
    }

    // Increment existing entry
    existing.hits++;
    return {
      totalHits: existing.hits,
      resetTime: new Date(existing.resetTime)
    };
  }
}
