import type { NextFunction, Request, Response } from 'express';
import type { Config, RateLimitStore } from '../../types';
import MemoryRateLimitStore from '../domain/memory-rate-limit-store';

const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const DEFAULT_MAX_HITS = 100;
const DEFAULT_MAX_CACHE_SIZE = 1000; // Maximum number of rate limit entries to keep in memory

function defaultKeyGenerator(req: Request): string {
  return `${req.ip}:${req.user ?? 'anon'}`;
}

export default function createPublishRateLimiter(conf: Config) {
  const rateLimitConfig = conf.publishRateLimit ?? {};
  const windowMs = rateLimitConfig.windowMs ?? DEFAULT_WINDOW_MS;
  const maxHits = rateLimitConfig.max ?? DEFAULT_MAX_HITS;
  const keyGenerator = rateLimitConfig.keyGenerator ?? defaultKeyGenerator;
  const skip = rateLimitConfig.skip;
  const maxCacheSize = rateLimitConfig.maxCacheSize ?? DEFAULT_MAX_CACHE_SIZE;

  // Use provided store or create memory store with configurable size
  const store: RateLimitStore =
    rateLimitConfig.store ?? new MemoryRateLimitStore(maxCacheSize);

  // Initialize store if it has an init method
  if (store.init) {
    store.init();
  }

  return async function publishRateLimiter(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Skip rate limiting if skip function returns true
      if (skip?.(req)) {
        return next();
      }

      const key = keyGenerator(req);
      const { totalHits, resetTime } = await store.increment(key, windowMs);

      if (totalHits > maxHits) {
        // Calculate seconds until reset
        const retryAfter = Math.ceil((resetTime.getTime() - Date.now()) / 1000);

        res.set('Retry-After', retryAfter.toString());

        res.status(429).json({
          error: 'rate_limit_exceeded',
          message: 'Too many publish requests',
          resetTime: resetTime.toISOString(),
          retryAfter
        });

        // Set Retry-After header
        return;
      }

      next();
    } catch (error) {
      // If rate limiting fails, log error but allow request to proceed
      console.error('Rate limiting error:', error);
      next();
    }
  };
}
