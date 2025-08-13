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

export default function (repository: Repository) {
  return async (req: Request, res: Response): Promise<void> => {
    let components: string[];

    try {
      components = await repository.getComponents();
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
    const componentResults = await Promise.all(
      components.map((component) =>
        repository.getComponent(component, undefined)
      )
    );

    if (isHtmlRequest(req.headers) && !!res.conf.discovery.ui) {
      const componentsInfo: ParsedComponent[] = componentResults.map(
        (result) => {
          if (result.oc?.date) {
            result.oc.stringifiedDate = dateStringified(
              new Date(result.oc.date)
            );
          }
          return mapComponentDetails(result);
        }
      );

      const componentsReleases = componentResults.reduce(
        (sum, result) => sum + result.allVersions.length,
        0
      );

      const stateCounts: { deprecated?: number; experimental?: number } = {};

      const componentsList = componentsInfo.map((component) => {
        const state: 'deprecated' | 'experimental' | '' =
          (component?.oc?.state as 'deprecated' | 'experimental' | '') || '';
        if (state) {
          stateCounts[state] = (stateCounts[state] || 0) + 1;
        }
        return {
          name: component.name,
          author: component.author,
          state
        };
      });

      componentsInfo.sort((a, b) => a.name.localeCompare(b.name));

      res.send(
        indexView(
          // @ts-ignore existing code relies on runtime merging
          Object.assign(baseResponse, {
            availableDependencies: getAvailableDependencies(
              res.conf.dependencies
            ),
            availablePlugins: res.conf.plugins,
            components: componentsInfo,
            componentsReleases,
            componentsList,
            q: req.query['q'] || '',
            stateCounts,
            templates: repository.getTemplatesInfo(),
            title: 'OpenComponents Registry'
          })
        )
      );
    } else {
      const state = req.query['state'] || '';
      let list = componentResults;
      if (!res.conf.discovery.experimental) {
        list = list.filter(
          (component) => component.oc?.state !== 'experimental'
        );
      }
      if (state) {
        list = list.filter((component) => component.oc?.state === state);
      }

      res.status(200).json(
        Object.assign(baseResponse, {
          components: list.map((component) =>
            urlBuilder.component(component.name, res.conf.baseUrl)
          )
        })
      );
    }
  };
}
