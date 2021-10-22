import async from 'async';
import parseAuthor from 'parse-author';
import _ from 'lodash';
import path from 'path';
import fs from 'fs-extra';

import dateStringified from '../../utils/date-stringify';
import getComponentsHistory from './helpers/get-components-history';
import getAvailableDependencies from './helpers/get-available-dependencies';
import indexView from '../views';
import urlBuilder = require('../domain/url-builder');
import { Author, Component, ParsedComponent, Repository } from '../../types';
import { NextFunction, Request, Response } from 'express';
import { IncomingHttpHeaders } from 'http';
import { PackageJson } from 'type-fest';
import { fromPromise } from 'universalify';

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
        return res.status(404).json({ error: res.errorDetails });
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
            repository.getComponent(component, (err, result) => {
              if (err) return callback(err as any);

              if (result.oc && result.oc.date) {
                result.oc.stringifiedDate = dateStringified(
                  new Date(result.oc.date)
                );
              }

              componentsInfo.push(mapComponentDetails(result));
              componentsReleases += result.allVersions.length;
              callback();
            }),
          err => {
            if (err) return next(err);

            componentsInfo = _.sortBy(componentsInfo, 'name');
            repository.getComponentsDetails((err, details) => {
              // eslint-disable-next-line no-console
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
                    componentsList: componentsInfo.map(component => {
                      const state: 'deprecated' | 'experimental' | undefined =
                        _.get(component, 'oc.state', '');
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
                    q: req.query.q || '',
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
            components: _.map(components, component =>
              urlBuilder.component(component, res.conf.baseUrl)
            )
          })
        );
      }
    });
  };
}
