import async from 'async';
import _ from 'lodash';

import GetComponentHelper, {
  GetComponentResult
} from './helpers/get-component';
import strings from '../../resources';
import { Config, Repository } from '../../types';
import { Request, RequestHandler, Response } from 'express';

type Component = {
  name: string;
  version: string;
  parameters: Record<string, string>;
};

export default function components(
  conf: Config,
  repository: Repository
): RequestHandler {
  const getComponent = GetComponentHelper(conf, repository);
  const setHeaders = (
    results: GetComponentResult[] | undefined,
    res: Response
  ) => {
    if (!results || results.length !== 1 || !results[0] || !res.set) {
      return;
    }
    res.set(results[0].headers);
  };

  return (req: Request, res: Response) => {
    const components = req.body.components as Component[];
    const registryErrors = strings.errors.registry;

    const returnError = function (message: string) {
      res.status(400).json({
        code: registryErrors.BATCH_ROUTE_BODY_NOT_VALID_CODE,
        error: registryErrors.BATCH_ROUTE_BODY_NOT_VALID(message)
      });
    };

    if (!components) {
      return returnError(
        registryErrors.BATCH_ROUTE_COMPONENTS_PROPERTY_MISSING
      );
    } else if (!Array.isArray(components)) {
      return returnError(registryErrors.BATCH_ROUTE_COMPONENTS_NOT_ARRAY);
    }

    if (!_.isEmpty(components)) {
      const errors = _.compact(
        components.map((component, index) => {
          return !component.name
            ? registryErrors.BATCH_ROUTE_COMPONENT_NAME_MISSING(index)
            : '';
        })
      );

      if (!_.isEmpty(errors)) {
        return returnError(errors.join(', '));
      }
    }

    async.map(
      components,
      (component, callback) => {
        getComponent(
          {
            conf: res.conf,
            name: component.name,
            headers: req.headers,
            ip: req.ip,
            omitHref: !!req.body.omitHref,
            parameters: { ...req.body.parameters, ...component.parameters },
            version: component.version
          },
          result => callback(null, result)
        );
      },
      // @ts-ignore
      (err: any, results: GetComponentResult[]) => {
        try {
          setHeaders(results, res);
          res.status(200).json(results);
        } catch (e) {
          // @ts-ignore I think this will never reach (how can setHeaders throw?)
          if (results.code && results.error) {
            // @ts-ignore
            res.status(500).json({ code: results.code, error: results.error });
          } else {
            res.status(500).json({
              code: 'RENDER_ERROR',
              error: strings.errors.registry.RENDER_ERROR(
                results
                  .map(x => `${x.response.name}@${x.response.version}`)
                  .join(', '),
                String(e)
              )
            });
          }
        }
      }
    );
  };
}
