import { serializeError } from 'serialize-error';

import type { Request, RequestHandler, Response } from 'express';
import strings from '../../resources';
import type { Config } from '../../types';
import type { Repository } from '../domain/repository';
import GetComponentHelper from './helpers/get-component';

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

          res.status(result.status).json(result.response);
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
