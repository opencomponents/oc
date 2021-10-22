import { serializeError } from 'serialize-error';
import _ from 'lodash';

import GetComponentHelper from './helpers/get-component';
import strings from '../../resources';
import { Config, Repository } from '../../types';
import { Request, RequestHandler, Response } from 'express';

export default function component(
  conf: Config,
  repository: Repository
): RequestHandler {
  const getComponent = GetComponentHelper(conf, repository);

  return (req: Request, res: Response): void => {
    getComponent(
      {
        conf: res.conf,
        headers: req.headers,
        ip: req.ip,
        name: req.params['componentName'],
        parameters: req.query as any,
        version: req.params['componentVersion']
      },
      result => {
        if (result.response.error) {
          if (_.isError(result.response.error)) {
            result.response.error = serializeError(result.response.error);
          }
          res.errorCode = result.response.code;
          res.errorDetails = result.response.error as any;
        }

        try {
          if (!_.isEmpty(result.headers)) {
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
