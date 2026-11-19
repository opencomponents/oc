import strings from '../../../resources';
import type { Component, Config } from '../../../types';
import errorToString from '../../../utils/error-to-string';
import eventsHandler from '../../domain/events-handler';
import type { OcResponse } from '../../domain/http-server/types';

export type TransformedInfo = Partial<Component> & Record<string, unknown>;

export async function transformInfo(
  conf: Config,
  component: Component
): Promise<TransformedInfo> {
  const transform = conf.discovery.transformInfo;
  if (!transform) return component as TransformedInfo;

  const info = await transform(component);
  if (!info || typeof info !== 'object' || Array.isArray(info)) {
    throw new Error('it must return an object');
  }

  return info;
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
