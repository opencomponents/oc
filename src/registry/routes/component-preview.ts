import type { Request, Response } from 'express';
import { fromPromise } from 'universalify';
import type { Component, Config, TemplateInfo } from '../../types';
import type { Repository } from '../domain/repository';
import * as urlBuilder from '../domain/url-builder';
import previewView from '../views/preview';
import * as getComponentFallback from './helpers/get-component-fallback';

function componentPreview(
  err: any,
  req: Request,
  res: Response,
  component: Component,
  templates: TemplateInfo[]
) {
  if (err) {
    res.errorDetails = err.registryError || err;
    res.errorCode = 'NOT_FOUND';
    res.status(404).json(err);
    return;
  }

  let liveReload = '';
  if (res.conf.liveReloadPort) {
    liveReload = `<script src="http://localhost:${res.conf.liveReloadPort}/livereload.js?snipver=1"></script>`;
  }

  const isHtmlRequest =
    !!req.headers.accept && req.headers.accept.indexOf('text/html') >= 0;

  if (isHtmlRequest) {
    res.send(
      previewView({
        component,
        fallbackClient: res.conf.fallbackClient
          ? `${res.conf.fallbackRegistryUrl.replace(/\/$/, '')}/oc-client/client.dev.js`
          : undefined,
        href: res.conf.baseUrl,
        liveReload,
        preload: res.conf.preload,
        qs: urlBuilder.queryString(req.query as any),
        templates
      })
    );
  } else {
    res.status(200).json(
      Object.assign(component, {
        requestVersion: req.params['componentVersion'] || ''
      })
    );
  }
}

export default function componentPreviewRoute(
  conf: Config,
  repository: Repository
) {
  return (req: Request, res: Response): void => {
    fromPromise(repository.getComponent)(
      req.params['componentName'],
      req.params['componentVersion'],
      (registryError: any, component) => {
        if (registryError && conf.fallbackRegistryUrl) {
          return getComponentFallback.getComponentPreview(
            conf,
            req,
            res,
            registryError,
            (fallbackError, fallbackComponent) => {
              componentPreview(
                fallbackError,
                req,
                res,
                fallbackComponent,
                repository.getTemplatesInfo()
              );
            }
          );
        }

        componentPreview(
          registryError,
          req,
          res,
          component,
          repository.getTemplatesInfo()
        );
      }
    );
  };
}
