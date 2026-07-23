import strings from '../../resources';
import type { Config } from '../../types';
import pLimit from '../../utils/pLimit';
import type {
  CookieOptions,
  OcHandler,
  OcResponse
} from '../domain/http-server/types';
import type { Repository } from '../domain/repository';
import GetComponentHelper, {
  type GetComponentResult
} from './helpers/get-component';

type Component = {
  action?: string;
  name: string;
  version: string;
  parameters: Record<string, string>;
};

export default function components(
  conf: Config,
  repository: Repository
): OcHandler {
  const getComponent = GetComponentHelper(conf, repository);
  const setHeaders = (
    results: GetComponentResult[] | undefined,
    res: OcResponse
  ) => {
    if (results?.length !== 1 || !results[0] || !res.set) {
      return;
    }
    if (results[0].headers) {
      res.set(results[0].headers);
    }
  };

  const setCookies = (
    results: GetComponentResult[] | undefined,
    res: OcResponse
  ) => {
    if (results?.length !== 1 || !results[0] || !res.cookie) {
      return;
    }
    const cookies = results[0].cookies;
    if (Array.isArray(cookies) && cookies.length > 0) {
      for (const cookie of cookies) {
        const opts: CookieOptions = (cookie.options ?? {}) as CookieOptions;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        res.cookie(cookie.name, cookie.value as any, opts);
      }
    }
  };

  return (req, res) => {
    const components = req.body.components as Component[];
    const registryErrors = strings.errors.registry;

    const returnError = (message: string) => {
      res.status(400).json({
        code: registryErrors.BATCH_ROUTE_BODY_NOT_VALID_CODE,
        error: registryErrors.BATCH_ROUTE_BODY_NOT_VALID(message)
      });
    };

    if (!components) {
      return returnError(
        registryErrors.BATCH_ROUTE_COMPONENTS_PROPERTY_MISSING
      );
    }
    if (!Array.isArray(components)) {
      return returnError(registryErrors.BATCH_ROUTE_COMPONENTS_NOT_ARRAY);
    }

    if (components.length) {
      const errors = components
        .map((component, index) => {
          return !component.name
            ? registryErrors.BATCH_ROUTE_COMPONENT_NAME_MISSING(index)
            : '';
        })
        .filter(Boolean);

      if (errors.length) {
        return returnError(errors.join(', '));
      }
    }

    const limit = pLimit(10);
    Promise.all(
      components.map((component) =>
        limit(
          () =>
            new Promise<GetComponentResult>((resolve) => {
              getComponent(
                {
                  conf: res.conf,
                  action: component.action,
                  name: component.name,
                  headers: req.headers,
                  ip: req.ip!,
                  omitHref: !!req.body.omitHref,
                  parameters: {
                    ...req.body.parameters,
                    ...component.parameters
                  },
                  version: component.version
                },
                resolve
              );
            })
        )
      )
    ).then((results) => {
      try {
        setHeaders(results, res);
        setCookies(results, res);
        res
          .status(200)
          .json(
            results.map((result) =>
              result.response.renderMode && !result.headers
                ? { ...result, headers: {} }
                : result
            )
          );
      } catch (e) {
        res.status(500).json({
          code: 'RENDER_ERROR',
          error: strings.errors.registry.RENDER_ERROR(
            results
              .map((x) => `${x.response.name}@${x.response.version}`)
              .join(', '),
            String(e)
          )
        });
      }
    });
  };
}
