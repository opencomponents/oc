import http from 'node:http';
import cookieParser from 'cookie-parser';
import errorhandler from 'errorhandler';
import express, { type Express, type Request, type Response } from 'express';
import morgan from 'morgan';
import multer from 'multer';
import responseTime from 'response-time';

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

export type HttpServerAdapter<TNative = unknown> = {
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
  native(): TNative;
  httpServer(): http.Server;
};

export interface ExpressServerAdapterOptions {
  port?: number | string;
}

export type HttpServerAdapterFactory<TOptions = unknown, TNative = unknown> = {
  (options?: unknown): HttpServerAdapter<TNative>;
  readonly __serverAdapterOptions?: TOptions;
};

type ExpressServerAdapterFactory = HttpServerAdapterFactory<
  ExpressServerAdapterOptions | number | string,
  Express
>;

const expressMiddleware = Symbol('expressMiddleware');
const ocResponseSym = Symbol('ocResponse');
const ocParamsSym = Symbol('ocParams');

type WrappedOcHandler = OcHandler & {
  [expressMiddleware]?: ExpressMiddleware;
};

interface ParamsMemo {
  source: object;
}

function stream(this: OcResponse, readable: NodeJS.ReadableStream): void {
  readable.pipe(this.raw);
}

function normaliseParams(raw: Record<string, unknown>): Record<string, string> {
  const params: Record<string, string> = { ...(raw as Record<string, string>) };
  const splat = raw['splat'];
  if (Array.isArray(splat)) {
    params['splat'] = splat.join('/');
  }
  return params;
}

function toExpressAdapterOptions(
  options?: unknown
): ExpressServerAdapterOptions {
  if (typeof options === 'number' || typeof options === 'string') {
    return { port: options };
  }
  if (options && typeof options === 'object') {
    return options as ExpressServerAdapterOptions;
  }
  return {};
}

const createExpressAdapter = ((options?: unknown): HttpServerAdapter<Express> =>
  new ExpressHttpServerAdapter(
    toExpressAdapterOptions(options).port
  )) as ExpressServerAdapterFactory;

export default createExpressAdapter;

class ExpressHttpServerAdapter implements HttpServerAdapter<Express> {
  name = 'express';

  private app: Express;
  private server?: http.Server;
  private serverErrorHandlers: Array<(err: Error) => void> = [];

  constructor(port?: number | string) {
    this.app = express();
    if (typeof port !== 'undefined') {
      this.app.set('port', port);
    }
    this.app.set('json spaces', 0);
    this.app.set('etag', 'strong');
  }

  enableBodyParser(opts: { limit?: number | string }): void {
    this.app.use(
      express.json({
        inflate: true,
        limit: opts.limit
      })
    );
    this.app.use(
      express.urlencoded({
        extended: true,
        limit: opts.limit
      })
    );
  }

  enableCookies(): void {
    this.app.use(cookieParser());
  }

  enableFileUploads(opts: {
    tempDir: string;
    filename: (originalName: string) => string;
  }): void {
    const upload = multer({
      limits: {
        fieldSize: 10
      },
      storage: multer.diskStorage({
        destination: opts.tempDir,
        filename: (_req, file, cb) => cb(null, opts.filename(file.originalname))
      })
    });

    this.app.use(upload.any());
  }

  enableRequestTiming(
    onDone: (req: OcRequest, res: OcResponse, ms: number) => void
  ): void {
    this.app.use(
      responseTime((req: Request, res: Response, time) => {
        onDone(this.toOcRequest(req), this.toOcResponse(res), time);
      })
    );
  }

  enableLogging(opts: {
    skip: (req: OcRequest, res: OcResponse) => boolean;
  }): void {
    this.app.use(
      morgan('dev', {
        skip: (req, res) =>
          opts.skip(this.toOcRequest(req), this.toOcResponse(res))
      })
    );
  }

  enableErrorHandler(): void {
    this.app.use(errorhandler());
  }

  use(handler: OcHandler): void {
    this.app.use(this.toExpressHandler(handler, true));
  }

  route(method: Method, path: string, id: string, handlers: OcHandler[]): void {
    const setRouteId: ExpressMiddleware = (req, _res, next) => {
      req.routeId = id;
      next();
    };

    this.app[method](
      path,
      setRouteId,
      ...handlers.map((handler) => this.toExpressHandler(handler))
    );
  }

  fromConnect(handler: ExpressMiddleware): OcHandler {
    const wrapped: WrappedOcHandler = (req, res) =>
      new Promise<void>((resolve, reject) => {
        handler(req.raw ?? req, res.raw ?? res, (err?: unknown) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

    wrapped[expressMiddleware] = handler;
    return wrapped;
  }

  listen(
    opts: { port: number | string; timeout: number; keepAliveTimeout?: number },
    cb: (err?: Error) => void
  ): void {
    this.server = http.createServer(this.app);
    this.server.timeout = opts.timeout;
    if (opts.keepAliveTimeout) {
      this.server.keepAliveTimeout = opts.keepAliveTimeout;
    }
    for (const handler of this.serverErrorHandlers) {
      this.server.on('error', handler);
    }
    this.server.listen(opts.port, cb as () => void);
  }

  onServerError(cb: (err: Error) => void): void {
    this.serverErrorHandlers.push(cb);
    this.server?.on('error', cb);
  }

  close(cb: (err?: Error) => void): void {
    this.server?.close(cb);
  }

  isListening(): boolean {
    return !!this.server?.listening;
  }

  native(): Express {
    return this.app;
  }

  httpServer(): http.Server {
    if (!this.server) {
      throw new Error('HTTP server has not been started');
    }

    return this.server;
  }

  private toExpressHandler(
    handler: OcHandler,
    continueWhenNotSent = false
  ): ExpressMiddleware {
    const native = (handler as WrappedOcHandler)[expressMiddleware];
    if (native) {
      return native;
    }

    return (req, res, next) => {
      let result: unknown;
      try {
        result = handler(
          this.toOcRequest(req as Request),
          this.toOcResponse(res as Response)
        );
      } catch (err) {
        next(err);
        return;
      }

      if (result && typeof (result as Promise<void>).then === 'function') {
        (result as Promise<void>)
          .then(() => {
            if (continueWhenNotSent && !(res as Response).headersSent) {
              next();
            }
          })
          .catch(next);
      } else if (continueWhenNotSent && !(res as Response).headersSent) {
        next();
      }
    };
  }

  private toOcRequest(req: Request): OcRequest {
    const memo = (req as unknown as { [ocParamsSym]?: ParamsMemo })[
      ocParamsSym
    ];
    const current = (req.params ?? {}) as object;
    if (memo && memo.source === current) {
      return req as unknown as OcRequest;
    }

    if (!memo) {
      Object.assign(req, {
        raw: req,
        routeId: (req as unknown as { routeId?: string }).routeId ?? ''
      });
    }

    const normalized = normaliseParams(current as Record<string, unknown>);
    Object.assign(req, { params: normalized });
    (req as unknown as { [ocParamsSym]: ParamsMemo })[ocParamsSym] = {
      source: normalized
    };

    return req as unknown as OcRequest;
  }

  private toOcResponse(res: Response): OcResponse {
    const cached = (res as unknown as { [ocResponseSym]?: OcResponse })[
      ocResponseSym
    ];
    if (cached) {
      return cached;
    }

    const ocRes = Object.assign(res, {
      raw: res,
      stream
    }) as unknown as OcResponse;

    (res as unknown as { [ocResponseSym]: OcResponse })[ocResponseSym] = ocRes;
    return ocRes;
  }
}
