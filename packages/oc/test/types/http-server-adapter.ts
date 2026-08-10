import type http from 'node:http';
import type {
  ExpressMiddleware,
  HttpServerAdapterFactory,
  HttpServerListenOptions,
  Method,
  OcHandler,
  OcRequest,
  OcResponse
} from '../../src/registry/domain/http-server/types';

type CallbackOnlyAdapter = {
  name: string;
  enableBodyParser(opts: { limit?: number | string }): void;
  enableCookies(): void;
  enableFileUploads(opts: {
    tempDir: string;
    filename: (originalName: string) => string;
  }): void;
  enableRequestTiming(
    onDone: (req: OcRequest, res: OcResponse, ms: number) => void
  ): void;
  enableLogging(opts: {
    skip: (req: OcRequest, res: OcResponse) => boolean;
  }): void;
  enableErrorHandler(): void;
  use(handler: OcHandler): void;
  route(method: Method, path: string, id: string, handlers: OcHandler[]): void;
  fromConnect(handler: ExpressMiddleware): OcHandler;
  listen(opts: HttpServerListenOptions, cb: (err?: Error) => void): void;
  onServerError(cb: (err: Error) => void): void;
  close(cb: (err?: Error) => void): void;
  isListening(): boolean;
  native(): unknown;
  httpServer(): http.Server;
};

declare const callbackOnlyFactory: (
  options?: unknown
) => CallbackOnlyAdapter;

const compatibleFactory: HttpServerAdapterFactory = callbackOnlyFactory;
void compatibleFactory;
