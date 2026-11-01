const errorProperties = [
  'name',
  'message',
  'stack',
  'code',
  'cause',
  'errors'
] as const;

const toJsonWasCalled = new WeakSet<object>();

const isErrorLike = (value: any): boolean =>
  !!value &&
  typeof value === 'object' &&
  typeof value.name === 'string' &&
  typeof value.message === 'string' &&
  typeof value.stack === 'string';

function destroyCircular(from: any, seen: unknown[]): any {
  seen.push(from);

  if (typeof from.toJSON === 'function' && !toJsonWasCalled.has(from)) {
    toJsonWasCalled.add(from);
    try {
      return from.toJSON();
    } finally {
      toJsonWasCalled.delete(from);
    }
  }

  const to: any = Array.isArray(from) ? [] : {};
  const next = (value: unknown) => destroyCircular(value, [...seen]);

  for (const [key, value] of Object.entries(from)) {
    if (typeof value === 'function') continue;
    if (value instanceof Uint8Array && value.constructor.name === 'Buffer') {
      to[key] = '[object Buffer]';
    } else if (
      value !== null &&
      typeof value === 'object' &&
      typeof (value as any).pipe === 'function'
    ) {
      to[key] = '[object Stream]';
    } else if (!value || typeof value !== 'object') {
      to[key] = value;
    } else {
      to[key] = seen.includes(value) ? '[Circular]' : next(value);
    }
  }

  for (const property of errorProperties) {
    const value = from[property];
    if (value !== undefined && value !== null) {
      to[property] =
        isErrorLike(value) || Array.isArray(value) ? next(value) : value;
    }
  }

  return to;
}

export default function serializeError(value: unknown): unknown {
  if (typeof value === 'object' && value !== null) {
    return destroyCircular(value, []);
  }
  if (typeof value === 'function') {
    return `[Function: ${value.name || 'anonymous'}]`;
  }
  return value;
}
