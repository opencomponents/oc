import { promisify } from 'util';
import pLimit from 'p-limit';
import _ from 'lodash';
import * as eventsHandler from './events-handler';
import getUnixUTCTimestamp from 'oc-get-unix-utc-timestamp';
import {
  Cdn,
  Component,
  ComponentsDetails,
  ComponentsList,
  Config
} from '../../types';

export default function componentsDetails(conf: Config, cdn: Cdn) {
  const returnError = (code: string, message: unknown) => {
    eventsHandler.fire('error', { code, message });
    throw code;
  };

  const filePath = (): string =>
    `${conf.storage.options.componentsDir}/components-details.json`;

  const getFromJson = (): Promise<ComponentsDetails> =>
    promisify(cdn.getJson)(filePath(), true);

  const getFromDirectories = async (options: {
    componentsList: ComponentsList;
    details?: ComponentsDetails;
  }): Promise<ComponentsDetails> => {
    const details = Object.assign({}, _.cloneDeep(options.details));
    details.components = details.components || {};

    const missing: Array<{ name: string; version: string }> = [];
    _.each(options.componentsList.components, (versions, name) => {
      details.components[name] = details.components[name] || {};
      _.each(versions, version => {
        if (!details.components[name][version]) {
          missing.push({ name, version });
        }
      });
    });

    const limit = pLimit(cdn.maxConcurrentRequests);

    await Promise.all(
      missing.map(({ name, version }) =>
        limit(async () => {
          const content: Component = await promisify(cdn.getJson)(
            `${conf.storage.options.componentsDir}/${name}/${version}/package.json`,
            true
          );
          details.components[name][version] = {
            publishDate: content.oc.date || 0
          };
        })
      )
    );

    return {
      lastEdit: getUnixUTCTimestamp(),
      components: details.components
    };
  };

  const save = (data: ComponentsDetails): Promise<unknown> =>
    promisify(cdn.putFileContent)(JSON.stringify(data), filePath(), true);

  const refresh = async (
    componentsList: ComponentsList
  ): Promise<ComponentsDetails> => {
    const jsonDetails = await getFromJson().catch(() => undefined);
    const dirDetails = await getFromDirectories({
      componentsList,
      details: jsonDetails
    }).catch(err => returnError('components_details_get', err));

    if (
      !jsonDetails ||
      !_.isEqual(dirDetails.components, jsonDetails.components)
    ) {
      await save(dirDetails).catch(err =>
        returnError('components_details_save', err)
      );
      return dirDetails;
    }

    return jsonDetails;
  };

  return {
    get: getFromJson,
    refresh
  };
}
