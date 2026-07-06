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

type WrappedOcHandler = OcHandler & {
  [expressMiddleware]?: ExpressMiddleware;
};

export default function createExpressAdapter(
  port?: number | string
): HttpServerAdapter {
  return new ExpressHttpServerAdapter(port);
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
      Promise.resolve(
        handler(
          this.toOcRequest(req as Request),
          this.toOcResponse(res as Response)
        )
      )
        .then(() => {
          if (continueWhenNotSent && !(res as Response).headersSent) {
            next();
          }
        })
        .catch(next);
    };
  }

  private toOcRequest(req: Request): OcRequest {
    const rawParams = req.params ?? {};
    const params = { ...rawParams } as Record<string, string>;
    if (Array.isArray(rawParams['splat'])) {
      params['splat'] = rawParams['splat'].join('/');
    }

    return Object.assign(req, {
      params,
      raw: req,
      routeId: (req as unknown as { routeId?: string }).routeId ?? ''
    }) as unknown as OcRequest;
  }

  private toOcResponse(res: Response): OcResponse {
    return Object.assign(res, {
      raw: res,
      stream: (readable: NodeJS.ReadableStream) => {
        readable.pipe(res);
      }
    }) as unknown as OcResponse;
  }
}
