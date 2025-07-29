import type { IncomingHttpHeaders } from 'node:http';
import type { Request, Response } from 'express';
import { type Dispatcher, request } from 'undici';
import type { Component, Config } from '../../../types';
import * as urlBuilder from '../../domain/url-builder';
import type { GetComponentResult } from './get-component';

type ComponentCallback = (
  err: { registryError: any; fallbackError: any } | null,
  data: Component
) => void;

function getComponentFallbackForViewType(
  buildUrl: (
    component: {
      name: string;
      version?: string;
      parameters?: Record<string, string>;
    },
    baseUrl: string
  ) => string,
  conf: Config,
  req: Request,
  res: Response,
  registryError: string | null,
  callback: ComponentCallback
) {
  const path = buildUrl(
    {
      name: req.params['componentName'],
      version: req.params['componentVersion']
    },
    conf.fallbackRegistryUrl
  );

  return request(path, {
    method: 'GET',
    headers: {
      ...req.headers,
      host: new URL(conf.fallbackRegistryUrl).host,
      accept: 'application/json'
    }
  })
    .then((response) => {
      if (response.statusCode !== 200) {
        throw response;
      }
      return response.body.text();
    })
    .then((fallbackResponse) => {
      try {
        return callback(null, JSON.parse(fallbackResponse));
      } catch {
        return callback(
          {
            registryError: registryError,
            fallbackError: `Could not parse fallback response: ${fallbackResponse}`
          },
          undefined as any
        );
      }
    })
    .catch(async (response: Dispatcher.ResponseData) => {
      if (response.statusCode === 304) {
        return res.status(304).send('');
      }

      return callback(
        {
          registryError: registryError,
          fallbackError: await response.body
            .text()
            .catch(() => response.statusCode)
        },
        undefined as any
      );
    });
}

export function getComponent(
  fallbackRegistryUrl: string,
  headers: IncomingHttpHeaders,
  component: { name: string; version: string; parameters: IncomingHttpHeaders },
  callback: (result: GetComponentResult) => void
): void {
  // For some reason, undici doesn't like the content-type header
  const { 'content-type': _, ...restHeaders } = headers;
  request(fallbackRegistryUrl, {
    method: 'POST',
    headers: {
      ...restHeaders,
      host: new URL(fallbackRegistryUrl).host,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ components: [component] })
  })
    .then((response) => {
      if (response.statusCode !== 200) {
        throw response;
      }
      return response.body.json() as any;
    })
    .then((res: GetComponentResult[]) => {
      if (!res || res.length === 0) {
        return callback({
          status: 404,
          response: {
            code: 'NOT_FOUND',
            error: 'Component not found'
          }
        });
      }

      return callback(res[0]);
    })
    .catch(async (err: Dispatcher.ResponseData) => {
      return callback({
        status: 404,
        response: {
          code: 'NOT_FOUND',
          error: await err.body.text().catch(() => err.statusCode)
        }
      });
    });
}

export function getComponentPreview(
  conf: Config,
  req: Request,
  res: Response,
  registryError: string | null,
  callback: ComponentCallback
): void {
  getComponentFallbackForViewType(
    urlBuilder.componentPreview,
    conf,
    req,
    res,
    registryError,
    callback
  );
}

export function getComponentInfo(
  conf: Config,
  req: Request,
  res: Response,
  registryError: string | null,
  callback: ComponentCallback
): void {
  getComponentFallbackForViewType(
    urlBuilder.componentInfo,
    conf,
    req,
    res,
    registryError,
    callback
  );
}
