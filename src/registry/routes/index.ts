import path from 'node:path';
import async from 'async';
import fs from 'fs-extra';
import _ from 'lodash';
import parseAuthor from 'parse-author';

import dateStringified from '../../utils/date-stringify';
import indexView from '../views';
import getAvailableDependencies from './helpers/get-available-dependencies';
import getComponentsHistory from './helpers/get-components-history';
import urlBuilder = require('../domain/url-builder');
import type { IncomingHttpHeaders } from 'node:http';
import type { NextFunction, Request, Response } from 'express';
import type { PackageJson } from 'type-fest';
import { fromPromise } from 'universalify';
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

export default function (repository: Repository) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fromPromise(repository.getComponents)((err, components) => {
      if (err) {
        res.errorDetails = 'cdn not available';
        res.status(404).json({ error: res.errorDetails });
        return;
      }

      const baseResponse = {
        href: res.conf.baseUrl,
        ocVersion: packageInfo.version,
        type: res.conf.local ? 'oc-registry-local' : 'oc-registry'
      };

      if (isHtmlRequest(req.headers) && !!res.conf.discovery) {
        let componentsInfo: ParsedComponent[] = [];
        let componentsReleases = 0;
        const stateCounts: { deprecated?: number; experimental?: number } = {};

        async.each(
          components,
          (component, callback) =>
            fromPromise(repository.getComponent)(
              component,
              undefined,
              (err, result) => {
                if (err) return callback(err as any);

                if (result.oc?.date) {
                  result.oc.stringifiedDate = dateStringified(
                    new Date(result.oc.date)
                  );
                }

                componentsInfo.push(mapComponentDetails(result));
                componentsReleases += result.allVersions.length;
                callback();
              }
            ),
          (err) => {
            if (err) return next(err);

            componentsInfo = _.sortBy(componentsInfo, 'name');
            fromPromise(repository.getComponentsDetails)((err, details) => {
              if (err) console.log(err);
              res.send(
                indexView(
                  // @ts-ignore
                  Object.assign(baseResponse, {
                    availableDependencies: getAvailableDependencies(
                      res.conf.dependencies
                    ),
                    availablePlugins: res.conf.plugins,
                    components: componentsInfo,
                    componentsReleases,
                    componentsList: componentsInfo.map((component) => {
                      const state: 'deprecated' | 'experimental' | '' =
                        component?.oc?.state || '';
                      if (state) {
                        stateCounts[state] = (stateCounts[state] || 0) + 1;
                      }

                      return {
                        name: component.name,
                        author: component.author,
                        state
                      };
                    }),
                    componentsHistory:
                      !res.conf.local && getComponentsHistory(details),
                    q: req.query['q'] || '',
                    stateCounts,
                    templates: repository.getTemplatesInfo(),
                    title: 'OpenComponents Registry'
                  })
                )
              );
            });
          }
        );
      } else {
        res.status(200).json(
          Object.assign(baseResponse, {
            components: components.map((component) =>
              urlBuilder.component(component, res.conf.baseUrl)
            )
          })
        );
      }
    });
  };
}
