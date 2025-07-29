import { Readable } from 'node:stream';
import { encode } from '@rdevis/turbo-stream';
import type { Request, RequestHandler, Response } from 'express';
import { serializeError } from 'serialize-error';
import strings from '../../resources';
import type { Config } from '../../types';
import type { Repository } from '../domain/repository';
import GetComponentHelper, { stream } from './helpers/get-component';

export default function component(
  conf: Config,
  repository: Repository
): RequestHandler {
  const getComponent = GetComponentHelper(conf, repository);

  return (req: Request, res: Response): void => {
    let parameters = req.query as Record<string, string>;
    if (req.method === 'POST') {
      parameters = {
        ...parameters,
        ...(req.body as Record<string, string>)
      };
    }

    getComponent(
      {
        action: req.params['action'],
        conf: res.conf,
        headers: req.headers,
        ip: req.ip!,
        name: req.params['componentName'],
        parameters,
        version: req.params['componentVersion']
      },
      (result) => {
        if (result.response.error) {
          if (
            Object.prototype.toString.call(result.response.error) ===
            '[object Error]'
          ) {
            result.response.error = serializeError(result.response.error);
          }
          res.errorCode = result.response.code;
          res.errorDetails = result.response.error as any;
        }

        try {
          if (Object.keys(result.headers ?? {}).length) {
            res.set(result.headers);
          }

          const streamEnabled =
            !!result.response.data?.component?.props?.[stream];
          if (streamEnabled) {
            delete result.response.data.component.props[stream];
            const webStream = encode({ ...result.response });

            const nodeStream = Readable.from(webStream);

            res.status(result.status);
            nodeStream.on('error', (err) => {
              res.status(500).end(String(err));
            });

            res.setHeader('Content-Type', 'x-text/stream');

            nodeStream.pipe(res).on('finish', () => {
              res.end();
            });
          } else {
            res.status(result.status).json(result.response);
          }
        } catch (e) {
          res.status(500).json({
            code: 'RENDER_ERROR',
            error: strings.errors.registry.RENDER_ERROR(
              `${result.response.name}@${result.response.version}`,
              String(e)
            )
          });
        }
      }
    );
  };
}
