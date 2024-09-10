import _ from 'lodash';
import getUnixUTCTimestamp from 'oc-get-unix-utc-timestamp';
import type { StorageAdapter } from 'oc-storage-adapters-utils';
import type {
  Component,
  ComponentsDetails,
  ComponentsList,
  Config
} from '../../types';
import pLimit from '../../utils/pLimit';
import eventsHandler from './events-handler';

export default function componentsDetails(conf: Config, cdn: StorageAdapter) {
  const returnError = (code: string, message: string | Error) => {
    eventsHandler.fire('error', {
      code,
      message: (message as Error)?.message ?? message
    });
    throw code;
  };

  const filePath = (): string =>
    `${conf.storage.options.componentsDir}/components-details.json`;

  const getFromJson = (): Promise<ComponentsDetails> =>
    cdn.getJson(filePath(), true);

  const getFromDirectories = async (options: {
    componentsList: ComponentsList;
    details?: ComponentsDetails;
  }): Promise<ComponentsDetails> => {
    const details = options.details
      ? structuredClone(options.details)
      : { components: {} as ComponentsDetails['components'] };

    const missing: Array<{ name: string; version: string }> = [];
    for (const [name, versions] of Object.entries(
      options.componentsList.components
    )) {
      details.components[name] = details.components[name] || {};
      for (const version of versions) {
        if (!details.components[name][version]) {
          missing.push({ name, version });
        }
      }
    }

    const limit = pLimit(cdn.maxConcurrentRequests);

    await Promise.all(
      missing.map(({ name, version }) =>
        limit(async () => {
          const content: Component = await cdn.getJson(
            `${conf.storage.options.componentsDir}/${name}/${version}/package.json`,
            true
          );
          details.components[name][version] = {
            publishDate: content.oc.date || 0,
            templateSize: content.oc.files.template.size
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
    cdn.putFileContent(JSON.stringify(data), filePath(), true);

  const refresh = async (
    componentsList: ComponentsList
  ): Promise<ComponentsDetails> => {
    const jsonDetails = await getFromJson().catch(() => undefined);
    const dirDetails = await getFromDirectories({
      componentsList,
      details: jsonDetails
    }).catch((err) => returnError('components_details_get', err));

    if (
      !jsonDetails ||
      !_.isEqual(dirDetails.components, jsonDetails.components)
    ) {
      await save(dirDetails).catch((err) =>
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
