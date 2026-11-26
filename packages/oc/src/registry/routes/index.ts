import path from 'node:path';
import fs from 'fs-extra';
import BoundedCache from '../../utils/bounded-cache';
import dateStringified from '../../utils/date-stringify';
import parseAuthor from '../../utils/parse-author';
import indexView from '../views';
import getAvailableDependencies from './helpers/get-available-dependencies';
import {
  sendTransformInfoError,
  transformInfo
} from './helpers/transform-info';

import urlBuilder = require('../domain/url-builder');

import type { IncomingHttpHeaders } from 'node:http';
import type { PackageJson } from 'type-fest';
import type {
  Author,
  Component,
  ComponentsList,
  Config,
  ParsedComponent
} from '../../types';
import type { OcHandler, OcRequest } from '../domain/http-server/types';
import type { Repository } from '../domain/repository';

const packageInfo: PackageJson = fs.readJsonSync(
  path.join(__dirname, '..', '..', '..', 'package.json')
);

const getParsedAuthor = (author?: Author | string): Author => {
  author = author || {};
  return typeof author === 'string' ? parseAuthor(author) : author;
};

const mapComponentDetails = (component: Component): ParsedComponent => ({
  ...component,
  author: getParsedAuthor(component.author),
  oc: component.oc.date
    ? {
        ...component.oc,
        stringifiedDate: dateStringified(new Date(component.oc.date))
      }
    : component.oc
});

const isHtmlRequest = (headers: IncomingHttpHeaders) =>
  !!headers.accept && headers.accept.indexOf('text/html') >= 0;

const excludedMeta = ['dependencies', 'devDependencies'];

const RESPONSE_CACHE_SIZE = 100;

type ListResponse =
  | { body: Record<string, unknown> }
  | { transformError: unknown };

type CachedListResponse = {
  componentsList: ComponentsList;
  response: Promise<ListResponse>;
};

const buildListResponse = async (
  conf: Config,
  query: OcRequest['query'],
  baseResponse: Record<string, unknown>,
  componentDetails: Component[]
): Promise<ListResponse> => {
  const requestedState = (query['state'] as string) || '';
  const metaQuery = query['meta'] as string;
  const includeMetadata =
    metaQuery && metaQuery !== 'false' && conf.discovery.api;

  let filteredComponents = componentDetails;

  if (!conf.discovery.experimental) {
    filteredComponents = filteredComponents.filter(
      (component) => component.oc?.state !== 'experimental'
    );
  }

  if (requestedState) {
    filteredComponents = filteredComponents.filter(
      (component) => component.oc?.state === requestedState
    );
  }

  // Build component responses
  let componentResponses: unknown[];
  try {
    componentResponses = await Promise.all(
      filteredComponents.map(async (component) => {
        const componentUrl = urlBuilder.component(component.name, conf.baseUrl);

        if (!includeMetadata) {
          return componentUrl;
        }

        const info = await transformInfo(conf, component);

        // Return all metadata fields
        if (metaQuery === 'true') {
          return {
            href: componentUrl,
            name: info.name,
            version: info.version,
            author: info.author,
            description: info.description,
            state: info.oc?.state,
            keywords: info.keywords || [],
            publishDate: info.oc?.date
              ? new Date(info.oc.date).toISOString()
              : undefined
          };
        }

        const requestedFields = metaQuery
          .split(',')
          .filter((field) => !excludedMeta.includes(field));
        const responseData = requestedFields.reduce(
          (acc, field) => {
            acc[field] = info[field];
            return acc;
          },
          {} as Record<string, any>
        );
        responseData['href'] = componentUrl;

        return responseData;
      })
    );
  } catch (err) {
    return { transformError: err };
  }

  return { body: { ...baseResponse, components: componentResponses } };
};

export default function (repository: Repository): OcHandler {
  const responseCache = new BoundedCache(RESPONSE_CACHE_SIZE);

  return async (req, res): Promise<void> => {
    let componentNames: string[];
    let componentsList: ComponentsList | undefined;
    try {
      componentNames = await repository.getComponents();
      componentsList = repository.getComponentsList();
    } catch {
      res.errorDetails = 'cdn not available';
      res.status(404).json({ error: res.errorDetails });
      return;
    }

    const baseResponse = {
      href: res.conf.baseUrl,
      ocVersion: packageInfo.version,
      type: res.conf.local ? 'oc-registry-local' : 'oc-registry'
    };

    const getComponentDetails = () =>
      Promise.all(
        componentNames.map((componentName) =>
          repository.getComponent(componentName, undefined)
        )
      );

    if (isHtmlRequest(req.headers) && res.conf.discovery.ui) {
      const componentDetails = await getComponentDetails();
      const processedComponents: ParsedComponent[] =
        componentDetails.map(mapComponentDetails);

      const totalReleases = componentDetails.reduce(
        (sum, component) => sum + component.allVersions.length,
        0
      );

      const stateCounts: { deprecated?: number; experimental?: number } = {};
      const componentsList = processedComponents.map((component) => {
        const componentState: 'deprecated' | 'experimental' | '' =
          (component?.oc?.state as 'deprecated' | 'experimental' | '') || '';

        if (componentState) {
          stateCounts[componentState] = (stateCounts[componentState] || 0) + 1;
        }

        return {
          name: component.name,
          author: component.author,
          state: componentState
        };
      });

      processedComponents.sort((a, b) => a.name.localeCompare(b.name));

      const userTheme = req.cookies?.['oc-theme'] || 'dark';

      res.send(
        indexView(
          // @ts-expect-error existing code relies on runtime merging
          Object.assign(baseResponse, {
            availableDependencies: getAvailableDependencies(
              res.conf.dependencies
            ),
            availablePlugins: res.conf.plugins,
            components: processedComponents,
            componentsReleases: totalReleases,
            componentsList,
            q: req.query['q'] || '',
            stateCounts,
            templates: repository.getTemplatesInfo(),
            title: 'OpenComponents Registry',
            theme: userTheme
          })
        )
      );
    } else {
      const cacheKey = JSON.stringify([
        req.query['meta'] ?? '',
        req.query['state'] ?? ''
      ]);
      const buildResponse = async () =>
        buildListResponse(
          res.conf,
          req.query,
          baseResponse,
          await getComponentDetails()
        );

      let response: Promise<ListResponse>;
      if (componentsList) {
        const cached = responseCache.get<CachedListResponse>('list', cacheKey);
        if (cached && cached.componentsList === componentsList) {
          response = cached.response;
        } else {
          const entry: CachedListResponse = {
            componentsList,
            response: buildResponse()
          };
          const evict = () => {
            if (responseCache.get('list', cacheKey) === entry) {
              responseCache.delete('list', cacheKey);
            }
          };
          entry.response.then(
            (result) => 'transformError' in result && evict(),
            evict
          );
          responseCache.set('list', cacheKey, entry);
          response = entry.response;
        }
      } else {
        response = buildResponse();
      }

      const result = await response;
      if ('transformError' in result) {
        sendTransformInfoError(res, result.transformError);
        return;
      }

      res.status(200).json(result.body);
    }
  };
}
