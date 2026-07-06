import type { Config } from '../../types';
import eventsHandler, { type RequestData } from '../domain/events-handler';
import type { HttpServerAdapter } from '../domain/http-server/types';
import baseUrlHandler from './base-url-handler';
import cors from './cors';
import discoveryHandler from './discovery-handler';

const normaliseFileName = (x: string) =>
  x.replace('.tar.gz', '').replace(/\W+/g, '-').toLowerCase();

export const bind = (
  adapter: HttpServerAdapter,
  options: Config
): HttpServerAdapter => {
  adapter.use(
    adapter.fromConnect((_req, res, next) => {
      res.conf = options;
      next();
    })
  );

  adapter.enableRequestTiming((req, res, time) => {
    const data: RequestData = {
      body: req.body,
      duration: time,
      headers: req.headers,
      method: req.method,
      path: req.path,
      relativeUrl: req.originalUrl,
      query: req.query,
      url: req.protocol + '://' + req.get('host') + req.originalUrl,
      statusCode: res.statusCode
    };

    if (res.errorDetails) {
      data.errorDetails = res.errorDetails;
    }

    if (res.errorCode) {
      data.errorCode = res.errorCode;
    }

    eventsHandler.fire('request', data);
  });
  adapter.enableCookies();
  adapter.enableBodyParser({ limit: options.postRequestPayloadSize });
  adapter.use(adapter.fromConnect(cors));
  if (!options.local) {
    adapter.enableFileUploads({
      tempDir: options.tempDir,
      filename: (originalName) =>
        `${normaliseFileName(originalName)}-${Date.now()}.tar.gz`
    });
  }
  adapter.use(adapter.fromConnect(baseUrlHandler));
  adapter.use(adapter.fromConnect(discoveryHandler));

  if (options.verbosity) {
    adapter.enableLogging({
      skip: (req, res) => {
        // Hide logging development console calls
        return req.url.startsWith(
          `${res.conf.prefix}~actions/$$__oc__server___console__$$`
        );
      }
    });
  }

  if (options.local) {
    adapter.enableErrorHandler();
  }

  return adapter;
};
