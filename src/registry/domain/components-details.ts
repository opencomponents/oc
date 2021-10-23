import async from 'async';
import _ from 'lodash';
import * as eventsHandler from './events-handler';
import getUnixUTCTimestamp from 'oc-get-unix-utc-timestamp';
import {
  Component,
  ComponentsDetails,
  ComponentsList,
  Config
} from '../../types';
import { StorageAdapter } from 'oc-storage-adapters-utils';

export default function componentsDetails(conf: Config, cdn: StorageAdapter) {
  const returnError = (
    code: string,
    message: string | Error,
    callback: (code: string) => void
  ) => {
    eventsHandler.fire('error', { code, message });
    return callback(code);
  };

  const filePath = (): string =>
    `${conf.storage.options.componentsDir}/components-details.json`;

  const getFromJson = (callback: Callback<ComponentsDetails, string>) =>
    cdn.getJson<ComponentsDetails>(filePath(), true, callback);

  const getFromDirectories = (
    options: { componentsList: ComponentsList; details: ComponentsDetails },
    callback: Callback<ComponentsDetails, Error | undefined>
  ) => {
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

    async.eachLimit(
      missing,
      cdn.maxConcurrentRequests,
      ({ name, version }, next) => {
        cdn.getJson<Component>(
          `${conf.storage.options.componentsDir}/${name}/${version}/package.json`,
          true,
          (err, content) => {
            if (err) {
              return next(err as any);
            }
            details.components[name][version] = {
              publishDate: content.oc.date || 0
            };
            next();
          }
        );
      },
      err =>
        callback(err, {
          lastEdit: getUnixUTCTimestamp(),
          components: details.components
        })
    );
  };

  const save = (data: ComponentsDetails, callback: Callback<unknown, string>) =>
    cdn.putFileContent(JSON.stringify(data), filePath(), true, callback);

  const refresh = (
    componentsList: ComponentsList,
    callback: Callback<ComponentsDetails>
  ) => {
    getFromJson((jsonErr, details: ComponentsDetails) => {
      getFromDirectories(
        { componentsList, details },
        (dirErr, dirDetails: ComponentsDetails) => {
          if (dirErr) {
            return returnError(
              'components_details_get',
              dirErr,
              callback as any
            );
          } else if (
            jsonErr ||
            !_.isEqual(dirDetails.components, details.components)
          ) {
            save(dirDetails, saveErr => {
              if (saveErr) {
                return returnError(
                  'components_details_save',
                  saveErr,
                  callback as any
                );
              }

              callback(null, dirDetails);
            });
          } else {
            callback(null, details);
          }
        }
      );
    });
  };

  return {
    get: getFromJson,
    refresh
  };
}
