import isEqual from 'lodash.isequal';
import getUnixUTCTimestamp from 'oc-get-unix-utc-timestamp';
import type { StorageAdapter } from 'oc-storage-adapters-utils';
import type {
  Component,
  ComponentDetail,
  ComponentsDetails,
  ComponentsList,
  Config
} from '../../types';
import pLimit from '../../utils/pLimit';
import eventsHandler from './events-handler';

export default function componentsDetails(conf: Config, cdn: StorageAdapter) {
  let cachedComponentsDetails: ComponentsDetails | undefined;
  let refreshLoop: NodeJS.Timeout;

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

  const poll = () => {
    return setTimeout(async () => {
      try {
        const data = await getFromJson();

        eventsHandler.fire('cache-poll', getUnixUTCTimestamp());

        if (
          !cachedComponentsDetails ||
          data.lastEdit > cachedComponentsDetails.lastEdit
        ) {
          cachedComponentsDetails = data;
        }
      } catch (err: any) {
        eventsHandler.fire('error', {
          code: 'components_details_get',
          message: err?.message || String(err)
        });
      }
      refreshLoop = poll();
    }, conf.pollingInterval * 1000);
  };

  const cacheDataAndStartPolling = (data: ComponentsDetails) => {
    cachedComponentsDetails = data;
    refreshLoop = poll();

    return data;
  };

  const getFromDirectories = async (options: {
    componentsList: ComponentsList;
    details?: ComponentsDetails;
  }): Promise<ComponentsDetails> => {
    const details = { components: {} as ComponentsDetails['components'] };

    for (const [name, componentDetails] of Object.entries(
      options.details?.components || {}
    )) {
      details.components[name] = componentDetails;
    }

    const missing: Array<{ name: string; version: string }> = [];
    const componentsNeedingClone = new Set<string>();
    for (const [name, versions] of Object.entries(
      options.componentsList.components
    )) {
      const componentDetails =
        details.components[name] || ({} as ComponentDetail);
      details.components[name] = componentDetails;
      for (const version of versions) {
        if (!componentDetails[version]) {
          missing.push({ name, version });
          if (options.details?.components?.[name]) {
            componentsNeedingClone.add(name);
          }
        }
      }
    }

    // Only shallow-clone component detail maps that will be mutated. This
    // keeps memory usage lower when most components are already up-to-date.
    for (const name of componentsNeedingClone) {
      details.components[name] = { ...details.components[name] };
    }

    const limit = pLimit(cdn.maxConcurrentRequests);

    await Promise.all(
      missing.map(({ name, version }) =>
        limit(async () => {
          const content: Component = await cdn.getJson(
            `${conf.storage.options.componentsDir}/${name}/${version}/package.json`,
            true
          );
          details.components[name]![version] = {
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

  const get = async (): Promise<ComponentsDetails> => {
    if (cachedComponentsDetails) {
      return cachedComponentsDetails;
    }

    cachedComponentsDetails = await getFromJson();

    return cachedComponentsDetails;
  };

  const refresh = async (
    componentsList: ComponentsList
  ): Promise<ComponentsDetails> => {
    clearTimeout(refreshLoop);

    const jsonDetails = await getFromJson().catch(() => undefined);
    const dirDetails = await getFromDirectories({
      componentsList,
      details: jsonDetails
    }).catch((err) => returnError('components_details_get', err));

    if (
      !jsonDetails ||
      !isEqual(dirDetails.components, jsonDetails.components)
    ) {
      await save(dirDetails).catch((err) =>
        returnError('components_details_save', err)
      );
      return cacheDataAndStartPolling(dirDetails);
    }

    return cacheDataAndStartPolling(jsonDetails);
  };

  return {
    get,
    refresh
  };
}
