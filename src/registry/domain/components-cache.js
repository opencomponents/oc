'use strict';

const async = require('async');
const semver = require('semver');
const _ = require('underscore');

const eventsHandler = require('./events-handler');
const getUnixUTCTimestamp = require('../../utils/get-unix-utc-timestamp');

module.exports = function(conf, cdn){

  let cachedComponentsList, refreshLoop;

  const componentsList = {
    getFromJson: callback => cdn.getJson(`${conf.s3.componentsDir}/components.json`, true, callback),

    getFromDirectories: (callback) => {
      const componentsInfo = {};

      const getVersionsForComponent = (componentName, cb) => {
        cdn.listSubDirectories(`${conf.s3.componentsDir}/${componentName}`, (err, versions) => {
          if(err){ return cb(err); }
          cb(null, versions.sort(semver.compare));
        });
      };

      cdn.listSubDirectories(conf.s3.componentsDir, (err, components) => {
        if(err){
          if(err.code === 'dir_not_found'){
            return callback(null, {
              lastEdit: getUnixUTCTimestamp(),
              components: []
            });
          }

          return callback(err);
        }

        async.map(components, getVersionsForComponent, (errors, versions) => {
          if(errors){ return callback(errors); }

          _.forEach(components, (component, i) => {
            componentsInfo[component] = versions[i];
          });

          callback(null, {
            lastEdit: getUnixUTCTimestamp(),
            components: componentsInfo
          });
        });
      });
    },

    save: (data, callback) => cdn.putFileContent(JSON.stringify(data), `${conf.s3.componentsDir}/components.json`, true, callback)
  };

  const poll = () => setTimeout(() => {
    componentsList.getFromJson((err, data) => {
      if(err){
        eventsHandler.fire('error', { code: 'components_list_get', message: err });
      } else {
        eventsHandler.fire('cache-poll', getUnixUTCTimestamp());

        if(data.lastEdit > cachedComponentsList.lastEdit){
          cachedComponentsList = data;
        }
      }
      refreshLoop = poll();
    });
  }, conf.pollingInterval * 1000);

  const cacheDataAndStartPolling = (data, callback) => {
    cachedComponentsList = data;
    eventsHandler.fire('cache-poll', getUnixUTCTimestamp());
    refreshLoop = poll();
    callback(null, data);
  };

  const returnError = (code, message, callback) => {
    eventsHandler.fire('error', { code, message });
    return callback(code);
  };

  const getAndSaveFromDirectories = (cb) => {
    componentsList.getFromDirectories((err, components) => {
      if(err){ return cb(err); }
      componentsList.save(components, (err) => {
        if(err){ return cb(err); }
        cb(err, components);
      });
    });
  };

  return {
    get: (callback) => {
      if(!cachedComponentsList){
        return returnError('components_cache_empty', `The component's cache was empty`, callback);
      }

      callback(null, cachedComponentsList);
    },
    load: (callback) => {
      componentsList.getFromJson((jsonErr, jsonComponents) => {
        componentsList.getFromDirectories((dirErr, dirComponents) => {
          if(dirErr){
            return returnError('components_list_get', dirErr, callback);
          } else if(jsonErr || !_.isEqual(dirComponents.components, jsonComponents.components)){
            componentsList.save(dirComponents, (saveErr) => {
              if(saveErr){
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
    refresh: (callback) => {
      clearTimeout(refreshLoop);
      getAndSaveFromDirectories((err, components) => {
        if(err){
          return returnError('components_cache_refresh', err, callback);
        }
        cacheDataAndStartPolling(components, callback);
      });
    }
  };
};
