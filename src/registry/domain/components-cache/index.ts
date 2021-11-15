import _ from 'lodash';
import getComponentsList from './components-list';
import eventsHandler from '../events-handler';
import getUnixUTCTimestamp from 'oc-get-unix-utc-timestamp';
import { Cdn, ComponentsList, Config } from '../../../types';

export default function componentsCache(conf: Config, cdn: Cdn) {
  let cachedComponentsList: ComponentsList;
  let refreshLoop: NodeJS.Timeout;

  const componentsList = getComponentsList(conf, cdn);

  const poll = () =>
    setTimeout(() => {
      componentsList.getFromJson((err, data) => {
        if (err) {
          eventsHandler.fire('error', {
            code: 'components_list_get',
            message: err
          });
        } else {
          eventsHandler.fire('cache-poll', getUnixUTCTimestamp());

          if (data.lastEdit > cachedComponentsList.lastEdit) {
            cachedComponentsList = data;
          }
        }
        refreshLoop = poll();
      });
    }, conf.pollingInterval * 1000);

  const cacheDataAndStartPolling = (
    data: ComponentsList,
    callback: (err: null, data: ComponentsList) => void
  ) => {
    cachedComponentsList = data;
    refreshLoop = poll();
    callback(null, data);
  };

  const returnError = (
    code: string,
    message: string,
    callback: (err: any | null, data: any) => void
  ) => {
    eventsHandler.fire('error', { code, message });
    return callback(code, undefined as any);
  };

  return {
    get(callback: (err: Error | null, data: ComponentsList) => void) {
      if (!cachedComponentsList) {
        return returnError(
          'components_cache_empty',
          `The component's cache was empty`,
          callback
        );
      }

      callback(null, cachedComponentsList);
    },

    load(callback: (err: Error | null, data: ComponentsList) => void) {
      componentsList.getFromJson((jsonErr, jsonComponents) => {
        componentsList.getFromDirectories((dirErr, dirComponents) => {
          if (dirErr) {
            return returnError('components_list_get', dirErr, callback);
          } else if (
            jsonErr ||
            !_.isEqual(dirComponents.components, jsonComponents.components)
          ) {
            componentsList.save(dirComponents, saveErr => {
              if (saveErr) {
                return returnError('components_list_save', saveErr, callback);
              }
              cacheDataAndStartPolling(dirComponents, callback);
            });
          } else {
            cacheDataAndStartPolling(jsonComponents, callback);
          }
        });
      });
    },
    refresh(callback: (err: Error | null, data: ComponentsList) => void) {
      clearTimeout(refreshLoop);
      componentsList.refresh((err, components) => {
        if (err) {
          return returnError('components_cache_refresh', err, callback);
        }

        cacheDataAndStartPolling(components, callback);
      });
    }
  };
}
