import http from 'node:http';
import cookieParser from 'cookie-parser';
import errorhandler from 'errorhandler';
import express, { type Express, type Request, type Response } from 'express';
import morgan from 'morgan';
import multer from 'multer';
import responseTime from 'response-time';

import type {
  ExpressMiddleware,
  HttpServerAdapter,
  Method,
  OcHandler,
  OcRequest,
  OcResponse
} from './types';

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

export default function createExpressAdapter(
  options?: unknown
): HttpServerAdapter {
  const adapterOptions = options as
    | { port?: number | string }
    | number
    | string
    | undefined;
  return new ExpressHttpServerAdapter(
    typeof adapterOptions === 'object' ? adapterOptions.port : adapterOptions
  );
}

class ExpressHttpServerAdapter implements HttpServerAdapter {
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
