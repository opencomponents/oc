import fs from 'fs-extra';
import path from 'path';
import got from 'got';
import _ from 'lodash';

import put from '../../utils/put';
import settings from '../../resources/settings';
import * as urlBuilder from '../../registry/domain/url-builder';
import * as urlParser from '../domain/url-parser';
import { RegistryCli } from '../../types';

const getOcVersion = (): string => {
  const ocPackagePath = path.join(__dirname, '../../../package.json');
  const ocInfo = fs.readJsonSync(ocPackagePath);

  return ocInfo.version;
};

interface RegistryOptions {
  registry?: string;
}

export default function registry(opts: RegistryOptions = {}): RegistryCli {
  let requestsHeaders = {
    'user-agent': `oc-cli-${getOcVersion()}/${process.version}-${
      process.platform
    }-${process.arch}`
  };

  return {
    async add(registry: string) {
      if (registry.slice(registry.length - 1) !== '/') {
        registry += '/';
      }
      try {
        const apiResponse: { type: string } = await got(registry, {
          headers: requestsHeaders
        }).json();

        if (!apiResponse) throw 'oc registry not available';
        if (apiResponse.type !== 'oc-registry') throw 'not a valid oc registry';

        const res = await fs
          .readJson(settings.configFile.src)
          .catch(() => ({}));

        if (!res.registries) {
          res.registries = [];
        }

        if (!_.includes(res.registries, registry)) {
          res.registries.push(registry);
        }

        return fs.writeJson(settings.configFile.src, res);
      } catch (err) {
        throw 'oc registry not available';
      }
    },
    async get() {
      if (opts.registry) {
        return [opts.registry];
      }

      try {
        const res = await fs.readJson(settings.configFile.src);

        if (!res.registries || res.registries.length === 0)
          throw 'No oc registries';

        return res.registries;
      } catch (err) {
        throw 'No oc registries';
      }
    },
    getApiComponentByHref(href: string) {
      return got(href + settings.registry.componentInfoPath, {
        headers: requestsHeaders
      }).json();
    },
    async getComponentPreviewUrlByUrl(componentHref: string) {
      const res: { requestVersion: string; href: string } = await got(
        componentHref,
        { headers: requestsHeaders }
      ).json();

      const parsed = urlParser.parse(res);

      return urlBuilder.componentPreview(parsed as any, parsed.registryUrl);
    },
    async putComponent(options: {
      username?: string;
      password?: string;
      route: string;
      path: string;
    }) {
      if (!!options.username && !!options.password) {
        requestsHeaders = _.extend(requestsHeaders, {
          Authorization:
            'Basic ' +
            new Buffer(options.username + ':' + options.password).toString(
              'base64'
            )
        });
      }
      try {
        await put(options.route, options.path, requestsHeaders);
      } catch (err) {
        let parsedError = err as any as { code?: string; error?: string };
        let errMsg = '';
        if (!_.isObject(err)) {
          try {
            parsedError = JSON.parse(String(err));
          } catch (er) {}
        }

        if (!!parsedError.code && parsedError.code === 'ECONNREFUSED') {
          errMsg = 'Connection to registry has not been established';
        } else if (
          parsedError.code !== 'cli_version_not_valid' &&
          parsedError.code !== 'node_version_not_valid' &&
          !!parsedError.error
        ) {
          errMsg = parsedError.error;
        }

        throw errMsg;
      }
    },
    async remove(registry: string) {
      if (registry.slice(registry.length - 1) !== '/') {
        registry += '/';
      }

      const res = await fs
        .readJson(settings.configFile.src)
        .catch(() => ({ registries: [] }));
      res.registries = _.without(res.registries, registry);

      await fs.writeJson(settings.configFile.src, res);
    }
  };
}
