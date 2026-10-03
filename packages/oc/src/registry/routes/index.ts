import path from 'node:path';
import fs from 'fs-extra';
import parseAuthor from 'parse-author';

import dateStringified from '../../utils/date-stringify';
import indexView from '../views';
import {
  DiscoveryResponseCache,
  getDiscoveryCacheKey,
  getDiscoveryVariant
} from './discovery-cache';
import getAvailableDependencies from './helpers/get-available-dependencies';

import urlBuilder = require('../domain/url-builder');

import type { IncomingHttpHeaders } from 'node:http';
import type { PackageJson } from 'type-fest';
import type { Author, Component, ParsedComponent } from '../../types';
import type { OcHandler, OcResponse } from '../domain/http-server/types';
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

const setDiscoveryCacheControl = (res: OcResponse): void => {
  const pollingInterval = res.conf.pollingInterval;
  if (
    typeof pollingInterval === 'number' &&
    Number.isFinite(pollingInterval) &&
    pollingInterval >= 0
  ) {
    res.set('Cache-Control', `public, max-age=${Math.floor(pollingInterval)}`);
  }
};

export default function (repository: Repository): OcHandler {
  // Per-registry-instance cache of built discovery responses. Entries are
  // keyed by `componentsList.lastEdit` (via `getComponentsDetails`, which
  // advances on every publish/poll update) plus the query variant, so a
  // repeat `GET /` skips the O(registry) `getComponent` fan-out and the
  // index view re-render. A cache hit still costs a single cheap
  // `getComponentsDetails()` read to learn the current `lastEdit`; every
  // other repository call is skipped.
  const cache = new DiscoveryResponseCache();

  return async (req, res): Promise<void> => {
    const wantsHtml = isHtmlRequest(req.headers) && res.conf.discovery.ui;

    let lastEdit: number | undefined;
    if (typeof repository.getComponentsDetails === 'function') {
      try {
        const details = await repository.getComponentsDetails();
        if (details && typeof details.lastEdit === 'number') {
          lastEdit = details.lastEdit;
        }
      } catch {
        lastEdit = undefined;
      }
    }

    // HTML-with-query responses embed the per-request search string, so they
    // bypass the cache (unbounded query cardinality); everything else is
    // keyed by its variant.
    const htmlQuery = wantsHtml ? (req.query['q'] as string) || '' : '';
    const variant = getDiscoveryVariant(
      req,
      res.conf.baseUrl,
      res.conf.local,
      res.conf.discovery.api,
      res.conf.discovery.experimental,
      wantsHtml ? 'html' : 'json'
    );
    const cacheKey = getDiscoveryCacheKey(variant);

    if (lastEdit !== undefined && htmlQuery === '') {
      const cached = cache.get(lastEdit, cacheKey);
      if (cached !== undefined) {
        if (wantsHtml) {
          res.send(cached);
        } else {
          setDiscoveryCacheControl(res);
          res.status(200).json(cached);
        }
        return;
      }
    }

    let componentNames: string[];
    try {
      componentNames = await repository.getComponents();
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

    const componentDetails = await Promise.all(
      componentNames.map((componentName) =>
        repository.getComponent(componentName, undefined)
      )
    );

    if (isHtmlRequest(req.headers) && res.conf.discovery.ui) {
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

      const html = indexView(
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
      );

      if (lastEdit !== undefined && htmlQuery === '') {
        cache.set(lastEdit, cacheKey, html);
      }

      res.send(html);
    } else {
      const requestedState = (req.query['state'] as string) || '';
      const includeMetadata =
        req.query['meta'] &&
        req.query['meta'] !== 'false' &&
        res.conf.discovery.api;

      let filteredComponents = componentDetails;

      if (!res.conf.discovery.experimental) {
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
      const componentResponses = filteredComponents.map((component) => {
        const componentUrl = urlBuilder.component(
          component.name,
          res.conf.baseUrl
        );

        if (includeMetadata) {
          const metaQuery = req.query['meta'] as string;

          // Return all metadata fields
          if (metaQuery === 'true') {
            return {
              href: componentUrl,
              name: component.name,
              version: component.version,
              author: component.author,
              description: component.description,
              state: component.oc.state,
              keywords: component.keywords || [],
              publishDate: new Date(component.oc.date).toISOString()
            };
          }

          const requestedFields = metaQuery
            .split(',')
            .filter((field) => !excludedMeta.includes(field));
          const responseData = requestedFields.reduce(
            (acc, field) => {
              acc[field] = component[field as keyof Component];
              return acc;
            },
            {} as Record<string, any>
          );
          responseData['href'] = componentUrl;

          return responseData;
        }

        return componentUrl;
      });

      const body = {
        ...baseResponse,
        components: componentResponses
      };

      if (lastEdit !== undefined) {
        cache.set(lastEdit, cacheKey, body);
      }

      setDiscoveryCacheControl(res);
      res.status(200).json(body);
    }
  };
}
