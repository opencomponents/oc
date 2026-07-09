import type http from 'node:http';
import type { IncomingHttpHeaders } from 'node:http';
import type { Config } from '../../../types';

export interface CookieOptions {
  domain?: string;
  encode?: (value: string) => string;
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  partitioned?: boolean;
  path?: string;
  priority?: 'low' | 'medium' | 'high';
  sameSite?: boolean | 'lax' | 'strict' | 'none';
  secure?: boolean;
  signed?: boolean;
}

export type Method = 'get' | 'post' | 'put' | 'patch' | 'head' | 'delete';

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer?: Buffer;
  stream?: NodeJS.ReadableStream;
  truncated?: boolean;
}

export interface OcRequest {
  method: string;
  url: string;
  path: string;
  originalUrl: string;
  protocol: string;
  secure: boolean;
  ip: string;
  headers: IncomingHttpHeaders;
  params: Record<string, string>;
  query: Record<string, unknown>;
  body: any;
  cookies: Record<string, string>;
  files?: UploadedFile[] | Record<string, UploadedFile[]>;
  user?: string;
  routeId: string;
  get(header: string): string | undefined;
  raw: http.IncomingMessage;
}

export interface OcResponse {
  conf: Config;
  errorCode?: string;
  errorDetails?: string;
  statusCode: number;
  status(code: number): this;
  json(body: unknown): void;
  send(body: unknown): void;
  set(field: string | Record<string, string>, value?: string): this;
  header(name: string, value: string): this;
  setHeader(name: string, value: string): this;
  removeHeader(name: string): this;
  type(mime: string): this;
  cookie(name: string, value: string, opts?: CookieOptions): this;
  redirect(url: string): void;
  end(chunk?: unknown): void;
  stream(readable: NodeJS.ReadableStream): void;
  raw: http.ServerResponse;
}

export type OcHandler = (
  req: OcRequest,
  res: OcResponse
) => void | Promise<void>;

export type ExpressMiddleware = (
  req: any,
  res: any,
  next: (err?: unknown) => void
) => void;

export type HttpServerAdapterFactory<TOptions = unknown> = {
  (options?: unknown): HttpServerAdapter;
  readonly __serverAdapterOptions?: TOptions;
};

export type HttpServerAdapterOptions<TAdapter> = TAdapter extends {
  readonly __serverAdapterOptions?: infer TOptions;
}
  ? TOptions
  : TAdapter extends (options?: infer TOptions) => HttpServerAdapter
    ? TOptions
    : unknown;

export interface HttpServerAdapter {
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
  listen(
    opts: { port: number | string; timeout: number; keepAliveTimeout?: number },
    cb: (err?: Error) => void
  ): void;
  onServerError(cb: (err: Error) => void): void;
  close(cb: (err?: Error) => void): void;
  isListening(): boolean;
  native(): unknown;
  httpServer(): http.Server;
}
