import { Request, Response } from 'express';
import request from 'minimal-request';
import url from 'url';
import { Component, Config } from '../../../types';
import * as urlBuilder from '../../domain/url-builder';

type ComponentCallback = Callback<
  Component,
  { registryError: any; fallbackError: any }
>;

function getComponentFallbackForViewType(
  buildUrl: (
    component: {
      name: string;
      version?: string;
      parameters?: Dictionary<string>;
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
      name: req.params.componentName,
      version: req.params.componentVersion
    },
    conf.fallbackRegistryUrl
  );

  return request(
    {
      method: 'get',
      url: path,
      headers: {
        ...req.headers,
        host: url.parse(conf.fallbackRegistryUrl).host,
        accept: 'application/json'
      }
    },
    (fallbackErr, fallbackResponse) => {
      if (fallbackErr === 304) {
        return res.status(304).send('');
      }

      if (fallbackErr) {
        return callback(
          {
            registryError: registryError,
            fallbackError: fallbackErr
          },
          undefined as any
        );
      }

      try {
        return callback(null, JSON.parse(fallbackResponse));
      } catch (parseError) {
        return callback(
          {
            registryError: registryError,
            fallbackError: `Could not parse fallback response: ${fallbackResponse}`
          },
          undefined as any
        );
      }
    }
  );
}

export function getComponent(
  fallbackRegistryUrl: string,
  headers: Dictionary<string>,
  component: { name: string; version: string; parameters: Dictionary<string> },
  callback: (
    result:
      | {
          status: number;
          response: { code: string; error: Error };
        }
      | Component
  ) => void
) {
  return request(
    {
      method: 'post',
      url: fallbackRegistryUrl,
      headers: { ...headers, host: url.parse(fallbackRegistryUrl).host },
      json: true,
      body: { components: [component] }
    },
    (err, res) => {
      if (err || !res || res.length === 0) {
        return callback({
          status: 404,
          response: {
            code: 'NOT_FOUND',
            error: err
          }
        });
      }

      return callback(res[0]);
    }
  );
}

export function getComponentPreview(
  conf: Config,
  req: Request,
  res: Response,
  registryError: string | null,
  callback: ComponentCallback
) {
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
) {
  getComponentFallbackForViewType(
    urlBuilder.componentInfo,
    conf,
    req,
    res,
    registryError,
    callback
  );
}
