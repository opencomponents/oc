import strings from '../../../resources';
import type { Component, Config, TransformInfo } from '../../../types';
import BoundedCache from '../../../utils/bounded-cache';
import errorToString from '../../../utils/error-to-string';
import eventsHandler from '../../domain/events-handler';
import type { OcResponse } from '../../domain/http-server/types';

export type TransformedInfo = Partial<Component> & Record<string, unknown>;

const CACHE_SIZE = 1000;
const caches = new WeakMap<TransformInfo, BoundedCache>();

const getCache = (transform: TransformInfo) => {
  let cache = caches.get(transform);
  if (!cache) {
    cache = new BoundedCache(CACHE_SIZE);
    caches.set(transform, cache);
  }
  return cache;
};

async function runTransform(
  transform: TransformInfo,
  component: Component
): Promise<TransformedInfo> {
  const info = await transform(component);
  if (!info || typeof info !== 'object' || Array.isArray(info)) {
    throw new Error('it must return an object');
  }

  return info as TransformedInfo;
}

export function transformInfo(
  conf: Config,
  component: Component
): Promise<TransformedInfo> {
  const transform = conf.discovery.transformInfo;
  if (!transform) return Promise.resolve(component as TransformedInfo);
  if (conf.local && conf.hotReloading) {
    return runTransform(transform, component);
  }

  const cache = getCache(transform);
  const key = JSON.stringify([
    component.name,
    component.version,
    component.allVersions
  ]);
  const cached = cache.get<Promise<TransformedInfo>>('transform-info', key);
  if (cached) return cached;

  const promise = runTransform(transform, component).catch((err) => {
    if (cache.get('transform-info', key) === promise) {
      cache.delete('transform-info', key);
    }
    throw err;
  });
  cache.set('transform-info', key, promise);

  return promise;
}

export function sendTransformInfoError(res: OcResponse, err: unknown): void {
  const message = errorToString(err);
  eventsHandler.fire('error', { code: 'TRANSFORM_INFO_FAILED', message });
  res.errorDetails = message;
  res.status(500).json({
    code: 'TRANSFORM_INFO_FAILED',
    error: strings.errors.registry.TRANSFORM_INFO_FAILED(message)
  });
}
