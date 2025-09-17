import path from 'node:path';
import fs from 'fs-extra';
import parseAuthor from 'parse-author';

import dateStringified from '../../utils/date-stringify';
import indexView from '../views';
import getAvailableDependencies from './helpers/get-available-dependencies';

import urlBuilder = require('../domain/url-builder');

import type { IncomingHttpHeaders } from 'node:http';
import type { Request, Response } from 'express';
import type { PackageJson } from 'type-fest';
import type { Author, Component, ParsedComponent } from '../../types';
import type { Repository } from '../domain/repository';

const packageInfo: PackageJson = fs.readJsonSync(
  path.join(__dirname, '..', '..', '..', 'package.json')
);

const getParsedAuthor = (author?: Author | string): Author => {
  author = author || {};
  return typeof author === 'string' ? parseAuthor(author) : author;
};

const mapComponentDetails = (component: Component): ParsedComponent =>
  Object.assign(component, { author: getParsedAuthor(component.author) });

const isHtmlRequest = (headers: IncomingHttpHeaders) =>
  !!headers.accept && headers.accept.indexOf('text/html') >= 0;

const excludedMeta = ['dependencies', 'devDependencies'];

export default function (repository: Repository) {
  return async (req: Request, res: Response): Promise<void> => {
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

    if (isHtmlRequest(req.headers) && !!res.conf.discovery.ui) {
      const processedComponents: ParsedComponent[] = componentDetails.map(
        (component) => {
          if (component.oc?.date) {
            component.oc.stringifiedDate = dateStringified(
              new Date(component.oc.date)
            );
          }
          return mapComponentDetails(component);
        }
      );

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

      res.status(200).json({
        ...baseResponse,
        components: componentResponses
      });
    }
  };
}
