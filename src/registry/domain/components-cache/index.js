'use strict';

const _ = require('lodash');

const ComponentsList = require('./components-list');
const eventsHandler = require('../events-handler');
const getUnixUTCTimestamp = require('oc-get-unix-utc-timestamp');

module.exports = (conf, cdn) => {
  let cachedComponentsList, refreshLoop;

  const componentsList = ComponentsList(conf, cdn);

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

  const cacheDataAndStartPolling = (data, callback) => {
    cachedComponentsList = data;
    refreshLoop = poll();
    callback(null, data);
  };

  const returnError = (code, message, callback) => {
    eventsHandler.fire('error', { code, message });
    return callback(code);
  };

  return {
    get: callback => {
      if (!cachedComponentsList) {
        return returnError(
          'components_cache_empty',
          `The component's cache was empty`,
          callback
        );
      }

      callback(null, cachedComponentsList);
    },

    load: callback => {
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
    refresh: callback => {
      clearTimeout(refreshLoop);
      componentsList.refresh((err, components) => {
        if (err) {
          return returnError('components_cache_refresh', err, callback);
        }

        cacheDataAndStartPolling(components, callback);
      });
    }
  };
};
