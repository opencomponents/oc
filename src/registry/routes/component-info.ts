import type { Request, Response } from 'express';
import parseAuthor from 'parse-author';
import { fromPromise } from 'universalify';
import type { Component, ComponentDetail, Config } from '../../types';
import type { Repository } from '../domain/repository';
import * as urlBuilder from '../domain/url-builder';
import infoView from '../views/info';
import * as getComponentFallback from './helpers/get-component-fallback';
import isUrlDiscoverable from './helpers/is-url-discoverable';

function getParams(component: Component) {
  let params: Record<string, string> = {};
  if (component.oc.parameters) {
    params = Object.fromEntries(
      Object.entries(component.oc.parameters || {})
        .filter(([, param]) => {
          // Include parameters that have either a default value or an example
          return param.default !== undefined || param.example !== undefined;
        })
        .map(([paramName, param]) => {
          // Prefer default value over example
          const value =
            param.default !== undefined
              ? String(param.default)
              : String(param.example);
          return [paramName, value];
        })
    );
  }

  return params;
}

function getParsedAuthor(component: Component) {
  const author = component.author || {};
  return typeof author === 'string' ? parseAuthor(author) : author;
}

interface InfoError {
  registryError?: string;
  fallbackError?: string;
}

function componentInfo(
  err: InfoError | string | null,
  req: Request,
  res: Response,
  component?: Component,
  componentDetail?: ComponentDetail
): void {
  if (!component || err) {
    res.errorDetails = (err as any).registryError || err;
    res.status(404).json(err);
    return;
  }

  const isHtmlRequest =
    !!req.headers.accept && req.headers.accept.indexOf('text/html') >= 0;

  if (isHtmlRequest && !!res.conf.discovery.ui) {
    const params = getParams(component);
    const parsedAuthor = getParsedAuthor(component);
    let href = res.conf.baseUrl;

    const repositoryUrl =
      typeof component.repository === 'string'
        ? component.repository
        : (component.repository?.url ?? null);

    fromPromise(isUrlDiscoverable)(href, (_err, result) => {
      if (!result.isDiscoverable) {
        href = `//${req.headers.host}${res.conf.prefix}`;
      }

      // Get theme from cookie or default to dark
      const theme = req.cookies?.['oc-theme'] || 'dark';

      res.send(
        infoView({
          component,
          componentDetail,
          dependencies: Object.keys(component.dependencies || {}),
          href,
          parsedAuthor,
          repositoryUrl,
          sandBoxDefaultQs: urlBuilder.queryString(params),
          title: 'Component Info',
          theme,
          robots: res.conf.discovery.robots
        })
      );
    });
  } else if (res.conf.discovery.api) {
    res.status(200).json(
      Object.assign(component, {
        requestVersion: req.params['componentVersion'] || ''
      })
    );
  } else {
    res.status(401);
  }
}

export default function componentInfoRoute(
  conf: Config,
  repository: Repository
) {
  async function handler(req: Request, res: Response): Promise<void> {
    try {
      const history = await repository
        .getComponentsDetails()
        .catch(() => undefined);
      const componentDetail = history?.components[req.params['componentName']];
      const component = await repository.getComponent(
        req.params['componentName'],
        req.params['componentVersion']
      );
      componentInfo(null, req, res, component, componentDetail);
    } catch (registryError) {
      if (conf.fallbackRegistryUrl) {
        return getComponentFallback.getComponentInfo(
          conf,
          req,
          res,
          registryError as any,
          (fallbackError, fallbackComponent) =>
            componentInfo(fallbackError, req, res, fallbackComponent)
        );
      }

      componentInfo(registryError as any, req, res);
    }
  }

  return handler;
}
