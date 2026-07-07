import { createWriteStream } from 'node:fs';
import { mkdir, stat } from 'node:fs/promises';
import type http from 'node:http';
import path from 'node:path';
import { parse as parseQueryString } from 'node:querystring';
import { pipeline } from 'node:stream/promises';
import { createBrotliDecompress, createGunzip, createInflate } from 'node:zlib';
import cookie from '@fastify/cookie';
import etag from '@fastify/etag';
import formbody from '@fastify/formbody';
import multipart from '@fastify/multipart';
import fastify, {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
  type HTTPMethods
} from 'fastify';
import { parse as parseQs } from 'qs';

type CookieOptions = {
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
};

type Method = 'get' | 'post' | 'put' | 'patch' | 'head' | 'delete';

type UploadedFile = {
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
};

type OcRequest = {
  method: string;
  url: string;
  path: string;
  originalUrl: string;
  protocol: string;
  secure: boolean;
  ip: string;
  headers: http.IncomingHttpHeaders;
  params: Record<string, string>;
  query: Record<string, unknown>;
  body: unknown;
  cookies: Record<string, string>;
  files?: UploadedFile[] | Record<string, UploadedFile[]>;
  user?: string;
  routeId: string;
  get(header: string): string | undefined;
  raw: http.IncomingMessage;
};

type OcResponse = {
  conf: any;
  errorCode?: string;
  errorDetails?: string;
  statusCode: number;
  status(code: number): OcResponse;
  json(body: unknown): void;
  send(body: unknown): void;
  set(field: string | Record<string, string>, value?: string): OcResponse;
  header(name: string, value: string): OcResponse;
  setHeader(name: string, value: string): OcResponse;
  removeHeader(name: string): OcResponse;
  type(mime: string): OcResponse;
  cookie(name: string, value: string, opts?: CookieOptions): OcResponse;
  redirect(url: string): void;
  end(chunk?: unknown): void;
  stream(readable: NodeJS.ReadableStream): void;
  raw: http.ServerResponse;
};

type OcHandler = (req: OcRequest, res: OcResponse) => void | Promise<void>;

type ExpressMiddleware = (
  req: any,
  res: any,
  next: (err?: unknown) => void
) => void;

type HttpServerAdapter = {
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
};

export interface FastifyServerAdapterOptions {
  host?: string;
  port?: number | string;
  trustProxy?: boolean | string | string[] | number;
}

const ocRequestSym = Symbol('ocRequest');
const ocResponseSym = Symbol('ocResponse');
const timingStartSym = Symbol('timingStart');
const multipartParsedSym = Symbol('multipartParsed');
const defaultBodyLimit = 100 * 1024;

type FastifyRequestWithState = FastifyRequest & {
  [ocRequestSym]?: MutableOcRequest;
  [timingStartSym]?: bigint;
  [multipartParsedSym]?: boolean;
};

type FastifyReplyWithState = FastifyReply & {
  [ocResponseSym]?: FastifyOcResponse;
};

type MutableOcRequest = OcRequest & {
  files?: UploadedFile[] | Record<string, UploadedFile[]>;
};

export default function createFastifyAdapter(
  options?: FastifyServerAdapterOptions | number | string
): HttpServerAdapter {
  const adapterOptions =
    typeof options === 'object' && options !== null
      ? options
      : { port: options };

  return new FastifyHttpServerAdapter(adapterOptions);
}

class FastifyHttpServerAdapter implements HttpServerAdapter {
  name = 'fastify';

  private app: FastifyInstance;
  private bodyInflationRegistered = false;
  private bodyLimit = defaultBodyLimit;
  private host?: string;
  private routes: Array<{ method: Method; path: string }> = [];
  private optionsRoutesRegistered = false;

  constructor(options: FastifyServerAdapterOptions = {}) {
    this.host = options.host;
    this.app = fastify({
      bodyLimit: this.bodyLimit,
      exposeHeadRoutes: true,
      logger: false,
      routerOptions: {
        querystringParser: (str) =>
          parseQueryString(str) as Record<string, unknown>
      },
      trustProxy: options.trustProxy
    });

    this.app.register(etag, { weak: false, replyWith304: true });
  }

  enableBodyParser(opts: { limit?: number | string }): void {
    this.bodyLimit = parseBodyLimit(opts.limit);
    this.registerBodyInflation();
    this.app.register(formbody, {
      bodyLimit: this.bodyLimit,
      parser: (body) => parseQs(body) as Record<string, unknown>
    });
  }

  enableCookies(): void {
    this.app.register(cookie);
  }

  enableFileUploads(opts: {
    tempDir: string;
    filename: (originalName: string) => string;
  }): void {
    this.app.register(multipart, {
      limits: {
        fieldSize: 10,
        fileSize: Number.MAX_SAFE_INTEGER
      }
    });

    this.app.addHook('preHandler', async (request) => {
      const req = request as FastifyRequestWithState;
      if (
        req[multipartParsedSym] ||
        typeof req.isMultipart !== 'function' ||
        !req.isMultipart()
      ) {
        return;
      }

      req[multipartParsedSym] = true;
      await mkdir(opts.tempDir, { recursive: true });

      const files: UploadedFile[] = [];
      const body: Record<string, unknown> = {};

      for await (const part of req.parts({
        limits: { fieldSize: 10, fileSize: Number.MAX_SAFE_INTEGER }
      })) {
        if (part.type === 'file') {
          const originalName = part.filename || 'file';
          const filename = opts.filename(originalName);
          const destination = opts.tempDir;
          const filePath = path.join(destination, filename);

          await pipeline(part.file, createWriteStream(filePath));
          const fileStats = await stat(filePath);

          files.push({
            destination,
            encoding: part.encoding,
            fieldname: part.fieldname,
            filename,
            mimetype: part.mimetype,
            originalname: originalName,
            path: filePath,
            size: fileStats.size,
            stream: part.file,
            truncated: (part.file as { truncated?: boolean }).truncated
          } as UploadedFile);
        } else {
          if (part.valueTruncated) {
            throw fastifyMultipartFieldLimitError(part.fieldname);
          }
          assignBodyField(body, part.fieldname, part.value);
        }
      }

      req.body = body;
      this.toOcRequest(req).files = files;
    });
  }

  enableRequestTiming(
    onDone: (req: OcRequest, res: OcResponse, ms: number) => void
  ): void {
    this.app.addHook('onRequest', (request, _reply, done) => {
      (request as FastifyRequestWithState)[timingStartSym] =
        process.hrtime.bigint();
      done();
    });

    this.app.addHook('onResponse', (request, reply, done) => {
      const req = request as FastifyRequestWithState;
      const start = req[timingStartSym] ?? process.hrtime.bigint();
      const ms = Number(process.hrtime.bigint() - start) / 1_000_000;
      onDone(this.toOcRequest(req), this.toOcResponse(reply), ms);
      done();
    });
  }

  enableLogging(opts: {
    skip: (req: OcRequest, res: OcResponse) => boolean;
  }): void {
    this.app.addHook('onResponse', (request, reply, done) => {
      const req = this.toOcRequest(request as FastifyRequestWithState);
      const res = this.toOcResponse(reply);
      let skip = false;
      try {
        skip = opts.skip(req, res);
      } catch {
        skip = false;
      }
      if (!skip) {
        console.log(
          `${req.method} ${req.url} ${res.statusCode} - ${Math.round(
            reply.elapsedTime
          )} ms`
        );
      }
      done();
    });
  }

  enableErrorHandler(): void {
    this.app.setErrorHandler((error, _request, reply) => {
      const err = error as {
        message?: string;
        stack?: string;
        statusCode?: number;
      };
      const statusCode =
        typeof err.statusCode === 'number' ? err.statusCode : 500;
      reply
        .code(statusCode)
        .type('text/html; charset=utf-8')
        .send(err.stack || err.message || String(error));
    });
  }

  use(handler: OcHandler): void {
    this.app.addHook('preHandler', async (request, reply) => {
      const ocReq = this.toOcRequest(request as FastifyRequestWithState);
      const ocRes = this.toOcResponse(reply);

      await handler(ocReq, ocRes);
    });
  }

  route(method: Method, routePath: string, id: string, handlers: OcHandler[]) {
    const url = toFastifyRoutePath(routePath);
    this.routes.push({ method, path: url });

    this.app.route({
      bodyLimit: this.bodyLimit,
      handler: (request, reply) => {
        const ocReq = this.toOcRequest(request as FastifyRequestWithState, id);
        const ocRes = this.toOcResponse(reply);

        void this.runRouteHandlers(handlers, ocReq, ocRes).catch((err) => {
          if (!reply.sent) {
            reply.send(err);
          }
        });

        return reply;
      },
      method: method.toUpperCase() as HTTPMethods,
      url
    });
  }

  fromConnect(handler: ExpressMiddleware): OcHandler {
    return (req, res) =>
      new Promise<void>((resolve, reject) => {
        let settled = false;
        const finish = (err?: unknown) => {
          if (settled) {
            return;
          }
          settled = true;
          cleanup();
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        };
        const cleanup = () => {
          res.raw.off('finish', onFinish);
          res.raw.off('close', onFinish);
          res.raw.off('error', onError);
        };
        const onFinish = () => finish();
        const onError = (err: Error) => finish(err);

        res.raw.once('finish', onFinish);
        res.raw.once('close', onFinish);
        res.raw.once('error', onError);

        try {
          handler(req, res, (err?: unknown) => finish(err));
          if (isResponseSent(res)) {
            finish();
          }
        } catch (err) {
          finish(err);
        }
      });
  }

  listen(
    opts: { port: number | string; timeout: number; keepAliveTimeout?: number },
    cb: (err?: Error) => void
  ): void {
    this.registerOptionsRoutes();

    this.app.server.timeout = opts.timeout;
    if (opts.keepAliveTimeout) {
      this.app.server.keepAliveTimeout = opts.keepAliveTimeout;
    }

    let port: number;
    try {
      port = normalisePort(opts.port);
    } catch (err) {
      cb(err instanceof Error ? err : new Error(String(err)));
      return;
    }

    this.app.listen({ host: this.host ?? '0.0.0.0', port }, (err) =>
      cb(err ?? undefined)
    );
  }

  onServerError(cb: (err: Error) => void): void {
    this.app.server.on('error', cb);
  }

  close(cb: (err?: Error) => void): void {
    this.app.close().then(() => cb(), cb);
  }

  isListening(): boolean {
    return this.app.server.listening;
  }

  native(): FastifyInstance {
    return this.app;
  }

  httpServer(): http.Server {
    return this.app.server;
  }

  private async runRouteHandlers(
    handlers: OcHandler[],
    req: OcRequest,
    res: OcResponse
  ): Promise<void> {
    if (handlers.length === 0) {
      res.status(404).end();
      return;
    }

    for (const handler of handlers) {
      await handler(req, res);
      if (isResponseSent(res)) {
        return;
      }
    }
  }

  private registerBodyInflation(): void {
    if (this.bodyInflationRegistered) {
      return;
    }

    this.bodyInflationRegistered = true;
    this.app.addHook('preParsing', (request, _reply, payload, done) => {
      const encoding = String(
        request.headers['content-encoding'] || ''
      ).toLowerCase();
      const decoder =
        encoding === 'gzip'
          ? createGunzip()
          : encoding === 'deflate'
            ? createInflate()
            : encoding === 'br'
              ? createBrotliDecompress()
              : undefined;

      if (!decoder) {
        done(null, payload);
        return;
      }

      Object.defineProperty(decoder, 'receivedEncodedLength', {
        get: () => decoder.bytesWritten
      });
      done(null, payload.pipe(decoder));
    });
  }

  private toOcRequest(
    request: FastifyRequestWithState,
    routeId?: string
  ): MutableOcRequest {
    const cached = request[ocRequestSym];
    const params = normaliseParams(request.params as Record<string, unknown>);
    const cookies = normaliseCookies(
      (request as FastifyRequest & { cookies?: Record<string, string> }).cookies
    );
    const originalUrl = request.originalUrl || request.url;

    if (cached) {
      Object.assign(cached, {
        body: request.body,
        cookies,
        headers: request.headers,
        ip: request.ip,
        method: request.method,
        originalUrl,
        params,
        path: getPath(request.url),
        protocol: request.protocol,
        query: request.query as Record<string, unknown>,
        routeId: routeId ?? cached.routeId,
        secure: request.protocol === 'https',
        url: request.url
      });
      return cached;
    }

    const ocReq: MutableOcRequest = {
      body: request.body,
      cookies,
      get: (header) => getHeader(request, header),
      headers: request.headers,
      ip: request.ip,
      method: request.method,
      originalUrl,
      params,
      path: getPath(request.url),
      protocol: request.protocol,
      query: request.query as Record<string, unknown>,
      raw: request.raw,
      routeId: routeId ?? '',
      secure: request.protocol === 'https',
      url: request.url
    };

    request[ocRequestSym] = ocReq;
    return ocReq;
  }

  private toOcResponse(reply: FastifyReply): FastifyOcResponse {
    const res = reply as FastifyReplyWithState;
    if (!res[ocResponseSym]) {
      res[ocResponseSym] = new FastifyOcResponse(reply);
    }

    return res[ocResponseSym];
  }

  private registerOptionsRoutes(): void {
    if (this.optionsRoutesRegistered) {
      return;
    }

    this.optionsRoutesRegistered = true;
    const handler = (request: FastifyRequest, reply: FastifyReply) => {
      reply.header('Allow', this.getAllowHeader(getPath(request.url))).send('');
    };

    this.app.route({ method: 'OPTIONS', url: '/', handler });
    this.app.route({ method: 'OPTIONS', url: '/*', handler });
  }

  private getAllowHeader(pathname: string): string {
    const matchingRoutes = this.routes.filter((route) =>
      routePathMatches(route.path, pathname)
    );
    const routes = matchingRoutes.length > 0 ? matchingRoutes : this.routes;
    const methods = new Set<string>(['OPTIONS']);
    for (const route of routes) {
      methods.add(route.method.toUpperCase());
      if (route.method === 'get') {
        methods.add('HEAD');
      }
    }

    return ['GET', 'HEAD', 'PUT', 'POST', 'PATCH', 'DELETE', 'OPTIONS']
      .filter((method) => methods.has(method))
      .join(', ');
  }
}

class FastifyOcResponse implements OcResponse {
  conf!: OcResponse['conf'];
  errorCode?: string;
  errorDetails?: string;
  raw: http.ServerResponse;
  private hasSent = false;

  constructor(private reply: FastifyReply) {
    this.raw = reply.raw;
  }

  get statusCode(): number {
    return this.reply.statusCode;
  }

  set statusCode(code: number) {
    this.reply.code(code);
  }

  get sent(): boolean {
    return this.hasSent || this.reply.sent || this.raw.writableEnded;
  }

  status(code: number): this {
    this.reply.code(code);
    return this;
  }

  json(body: unknown): void {
    this.hasSent = true;
    this.reply.type('application/json; charset=utf-8').send(body);
  }

  send(body: unknown): void {
    if (typeof body === 'string' && !this.reply.hasHeader('content-type')) {
      this.reply.type('text/html; charset=utf-8');
    }

    this.hasSent = true;
    this.reply.send(body);
  }

  set(field: string | Record<string, string>, value?: string): this {
    if (typeof field === 'string') {
      this.reply.header(field, value);
    } else {
      this.reply.headers(field);
    }
    return this;
  }

  header(name: string, value: string): this {
    return this.set(name, value);
  }

  setHeader(name: string, value: string): this {
    return this.set(name, value);
  }

  removeHeader(name: string): this {
    this.reply.removeHeader(name);
    return this;
  }

  type(mime: string): this {
    this.reply.type(mime);
    return this;
  }

  cookie(name: string, value: string, opts?: CookieOptions): this {
    this.reply.cookie(
      name,
      String(value),
      toFastifyCookieOptions(opts) as never
    );
    return this;
  }

  redirect(url: string): void {
    this.hasSent = true;
    this.reply.redirect(url);
  }

  end(chunk?: unknown): void {
    this.hasSent = true;
    this.reply.send(chunk);
  }

  stream(readable: NodeJS.ReadableStream): void {
    readable.on('error', (err) => {
      if (this.raw.headersSent) {
        this.raw.destroy(err instanceof Error ? err : undefined);
      } else if (!this.sent) {
        this.status(500).end(String(err));
      }
    });
    this.hasSent = true;
    this.reply.send(readable);
  }
}

function toFastifyCookieOptions(opts?: CookieOptions): CookieOptions {
  if (opts?.signed) {
    throw new Error('Signed cookies require a Fastify cookie secret');
  }

  const next: CookieOptions = { ...(opts ?? {}), path: opts?.path ?? '/' };
  if (typeof opts?.maxAge === 'number') {
    next.maxAge = Math.floor(opts.maxAge / 1000);
    if (!opts.expires) {
      next.expires = new Date(Date.now() + opts.maxAge);
    }
  }

  return next;
}

function fastifyMultipartFieldLimitError(fieldname: string): Error {
  const err = new Error(`Field value too long: ${fieldname}`) as Error & {
    code?: string;
    statusCode?: number;
  };
  err.code = 'LIMIT_FIELD_VALUE';
  err.statusCode = 413;
  return err;
}

function parseBodyLimit(limit?: number | string): number {
  if (typeof limit === 'number') {
    return limit;
  }

  if (!limit) {
    return defaultBodyLimit;
  }

  const match = /^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/i.exec(limit);
  if (!match) {
    throw new Error(`Invalid body parser limit: ${limit}`);
  }

  const value = Number(match[1]);
  const unit = (match[2] || 'b').toLowerCase();
  const multiplier =
    unit === 'gb'
      ? 1024 ** 3
      : unit === 'mb'
        ? 1024 ** 2
        : unit === 'kb'
          ? 1024
          : 1;

  return Math.floor(value * multiplier);
}

function normalisePort(port: number | string): number {
  if (typeof port === 'number') {
    return port;
  }

  const parsed = Number(port);
  if (!Number.isInteger(parsed)) {
    throw new Error(`Fastify adapter requires a numeric port, got "${port}"`);
  }

  return parsed;
}

function toFastifyRoutePath(routePath: string): string {
  return routePath.replace(/\*[A-Za-z0-9_]+/g, '*');
}

function routePathMatches(routePath: string, pathname: string): boolean {
  if (routePath === pathname) {
    return true;
  }

  const pattern = routePath
    .split('/')
    .map((segment) => {
      if (segment === '*') {
        return '.*';
      }
      if (segment.startsWith(':')) {
        return '[^/]+';
      }
      return escapeRegExp(segment);
    })
    .join('/');

  return new RegExp(`^${pattern}$`).test(pathname);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normaliseParams(raw: Record<string, unknown>): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw || {})) {
    if (typeof value === 'string') {
      params[key] = value;
    } else if (Array.isArray(value)) {
      params[key] = value.join('/');
    } else if (typeof value !== 'undefined') {
      params[key] = String(value);
    }
  }

  const splat = raw['*'];
  if (typeof splat === 'string') {
    params['splat'] = splat;
    delete params['*'];
  } else if (Array.isArray(splat)) {
    params['splat'] = splat.join('/');
    delete params['*'];
  }

  return params;
}

function normaliseCookies(
  cookies?: Record<string, string | undefined>
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(cookies || {})) {
    if (typeof value !== 'undefined') {
      result[key] = value;
    }
  }
  return result;
}

function getHeader(
  request: FastifyRequest,
  header: string
): string | undefined {
  const value = request.headers[header.toLowerCase()];
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return value;
}

function getPath(url: string): string {
  const queryStart = url.indexOf('?');
  return queryStart === -1 ? url : url.slice(0, queryStart);
}

function assignBodyField(
  body: Record<string, unknown>,
  field: string,
  value: unknown
): void {
  if (typeof body[field] === 'undefined') {
    body[field] = value;
  } else if (Array.isArray(body[field])) {
    (body[field] as unknown[]).push(value);
  } else {
    body[field] = [body[field], value];
  }
}

function isResponseSent(res: OcResponse): boolean {
  return res instanceof FastifyOcResponse
    ? res.sent
    : res.raw.writableEnded || res.raw.headersSent;
}
