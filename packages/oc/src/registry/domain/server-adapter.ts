import type { HttpServerAdapter } from './http-server/types';

type HttpServerAdapterFactory<T = unknown> = (options?: T) => HttpServerAdapter;

function isHttpServerAdapter(adapter: unknown): adapter is HttpServerAdapter {
  return (
    !!adapter &&
    typeof adapter === 'object' &&
    typeof (adapter as HttpServerAdapter).native === 'function' &&
    typeof (adapter as HttpServerAdapter).listen === 'function' &&
    typeof (adapter as HttpServerAdapter).httpServer === 'function'
  );
}

export default function getHttpServerAdapter<T = unknown>(
  adapter: HttpServerAdapter | HttpServerAdapterFactory<T>,
  options?: T
): HttpServerAdapter {
  if (isHttpServerAdapter(adapter)) {
    return adapter;
  }

  const instance = adapter(options);
  if (!isHttpServerAdapter(instance)) {
    throw new Error('Invalid HTTP server adapter');
  }

  return instance;
}
