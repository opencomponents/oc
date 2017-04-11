'use strict';

const async = require('async');
const semver = require('semver');
const _ = require('underscore');

const eventsHandler = require('./events-handler');
const getUnixUTCTimestamp = require('../../utils/get-unix-utc-timestamp');

module.exports = function(conf, cdn){

  let cachedComponentsList, refreshLoop;

  const getFromJson = callback => cdn.getJson(`${conf.s3.componentsDir}/components.json`, true, callback);

  const updateCachedData = (newData) => {
    eventsHandler.fire('cache-poll', getUnixUTCTimestamp());
    if(newData.lastEdit > cachedComponentsList.lastEdit){
      cachedComponentsList = newData;
    }
  };

  const refreshCachedData = () => {
    refreshLoop = setTimeout(() => {
      getFromJson((err, data) => {
        if(err){
          eventsHandler.fire('error', { code: 'components_list_get', message: err });
        } else {
          updateCachedData(data);
        }
        refreshLoop = refreshCachedData();
      });
    }, conf.pollingInterval * 1000);
  };

  const cacheDataAndStartRefresh = (data, cb) => {
    eventsHandler.fire('cache-poll', getUnixUTCTimestamp());
    cachedComponentsList = data;
    refreshCachedData();
    cb(null, data);
  };

  const getVersionsForComponent = (componentName, cb) => {
    cdn.listSubDirectories(`${conf.s3.componentsDir}/${componentName}`, (err, versions) => {
      if(err){ return cb(err); }
      cb(null, versions.sort(semver.compare));
    });
  };

  const getFromDirectories = (cb) => {
    const componentsInfo = {};

    cdn.listSubDirectories(conf.s3.componentsDir, (err, components) => {
      if(err){
        if(err.code === 'dir_not_found'){
          return cb(null, {
            lastEdit: getUnixUTCTimestamp(),
            components: []
          });
        }

        return cb(err);
      }

      async.map(components, getVersionsForComponent, (errors, versions) => {
        if(errors){ return cb(errors); }

        _.forEach(components, (component, i) => {
          componentsInfo[component] = versions[i];
        });

        cb(null, {
          lastEdit: getUnixUTCTimestamp(),
          components: componentsInfo
        });
      });
    });
  };

  const returnError = (code, message, callback) => {
    eventsHandler.fire('error', { code, message });
    return callback(code);
  };

  const saveData = (data, callback) => {
    cdn.putFileContent(JSON.stringify(data), `${conf.s3.componentsDir}/components.json`, true, callback);
  };

  const getAndSaveFromDirectories = (cb) => {
    getFromDirectories((err, components) => {
      if(err){ return cb(err); }
      saveData(components, (err) => {
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
      getFromJson((jsonErr, jsonComponents) => {
        getFromDirectories((dirErr, dirComponents) => {
          if(dirErr){
            return returnError('components_list_get', dirErr, callback);
          } else if(jsonErr || !_.isEqual(dirComponents.components, jsonComponents.components)){
            saveData(dirComponents, (saveErr) => {
              if(saveErr){
                return returnError('components_list_save', saveErr, callback);
              }
              cacheDataAndStartRefresh(dirComponents, callback);
            });
          } else {
            cacheDataAndStartRefresh(jsonComponents, callback);
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
        cacheDataAndStartRefresh(components, callback);
      });
    }
  };
};
