import _ from 'lodash';
import getComponentsList from './components-list';
import * as eventsHandler from '../events-handler';
import getUnixUTCTimestamp from 'oc-get-unix-utc-timestamp';
import { ComponentsList, Config } from '../../../types';
import { StorageAdapter } from 'oc-storage-adapters-utils';

export default function componentsCache(conf: Config, cdn: StorageAdapter) {
  let cachedComponentsList: ComponentsList;
  let refreshLoop: NodeJS.Timeout;

  const componentsList = getComponentsList(conf, cdn);

  const poll = () =>
    setTimeout(async () => {
      try {
        const data = await componentsList.getFromJson();

        eventsHandler.fire('cache-poll', getUnixUTCTimestamp());

        if (data.lastEdit > cachedComponentsList.lastEdit) {
          cachedComponentsList = data;
        }
      } catch (err) {
        eventsHandler.fire('error', {
          code: 'components_list_get',
          message: err
        });
      }
      refreshLoop = poll();
    }, conf.pollingInterval * 1000);

  const cacheDataAndStartPolling = (data: ComponentsList) => {
    cachedComponentsList = data;
    refreshLoop = poll();

    return data;
  };

  const throwError = (code: string, message: any) => {
    eventsHandler.fire('error', { code, message: message?.message ?? message });
    throw code;
  };

  return {
    get(): ComponentsList {
      if (!cachedComponentsList) {
        return throwError(
          'components_cache_empty',
          `The component's cache was empty`
        );
      }

      return cachedComponentsList;
    },

    async load(): Promise<ComponentsList> {
      const dirComponents = await componentsList
        .getFromDirectories()
        .catch(err => throwError('components_list_get', err));
      const jsonComponents = await componentsList
        .getFromJson()
        .catch(() => null);

      if (
        !jsonComponents ||
        !_.isEqual(dirComponents.components, jsonComponents.components)
      ) {
        await componentsList
          .save(dirComponents)
          .catch(err => throwError('components_list_save', err));
      }
      cacheDataAndStartPolling(dirComponents);

      return dirComponents;
    },

    async refresh(): Promise<ComponentsList> {
      clearTimeout(refreshLoop);
      try {
        const components = await componentsList.refresh();
        cacheDataAndStartPolling(components);

        return components;
      } catch (err) {
        return throwError('components_cache_refresh', err);
      }
    }
  };
}
