'use strict';

const async = require('async');
const semver = require('semver');
const _ = require('underscore');

const eventsHandler = require('./events-handler');
const getUnixUTCTimestamp = require('../../utils/get-unix-utc-timestamp');

module.exports = function(conf, cdn){

  let cachedComponentsList,
    refreshLoop;

  const getFromJson = function(cb){
    cdn.getFile(conf.s3.componentsDir + '/components.json', true, function(err, res){
      let result;

      if(!err){
        try {
          result = JSON.parse(res);
        } catch(e){
          return cb(e);
        }
      }

      cb(err, result);
    });
  };

  const updateCachedData = function(newData){
    eventsHandler.fire('cache-poll', getUnixUTCTimestamp());
    if(newData.lastEdit > cachedComponentsList.lastEdit){
      cachedComponentsList = newData;
    }
  };

  const refreshCachedData = function(){
    refreshLoop = setTimeout(function(){
      getFromJson(function(err, data){
        if(err){
          eventsHandler.fire('error', { code: 'components_list_get', message: err });
        } else {
          updateCachedData(data);
        }
        refreshLoop = refreshCachedData();
      });
    }, conf.pollingInterval * 1000);
  };

  const cacheDataAndStartRefresh = function(data, cb){
    eventsHandler.fire('cache-poll', getUnixUTCTimestamp());
    cachedComponentsList = data;
    refreshCachedData();
    cb(null, data);
  };

  const getVersionsForComponent  = function(componentName, cb){
    cdn.listSubDirectories(conf.s3.componentsDir + '/' + componentName, function(err, versions){
      if(err){ return cb(err); }
      cb(null, versions.sort(semver.compare));
    });
  };

  const getFromDirectories = function(cb){
    const componentsInfo = {};

    cdn.listSubDirectories(conf.s3.componentsDir, function(err, components){
      if(err){
        if(err.code === 'dir_not_found'){
          return cb(null, {
            lastEdit: getUnixUTCTimestamp(),
            components: []
          });
        }

        return cb(err);
      }

      async.map(components, getVersionsForComponent, function(errors, versions){
        if(errors){ return cb(errors); }

        _.forEach(components, function(component, i){
          componentsInfo[component] = versions[i];
        });

        cb(null, {
          lastEdit: getUnixUTCTimestamp(),
          components: componentsInfo
        });
      });
    });
  };

  const returnError = function(errorCode, errorMessage, callback){
    eventsHandler.fire('error', { code: errorCode, message: errorMessage });
    return callback(errorCode);
  };

  const saveData = function(data, callback){
    cdn.putFileContent(JSON.stringify(data), conf.s3.componentsDir + '/components.json', true, callback);
  };

  const getAndSaveFromDirectories = function(cb){
    getFromDirectories(function(err, components){
      if(err){ return cb(err); }
      saveData(components, function(err){
        if(err){ return cb(err); }
        cb(err, components);
      });
    });
  };

  return {
    get: function(callback){
      if(!cachedComponentsList){ return returnError('components_cache_empty', 'The component\'s cache was empty', callback); }
      callback(null, cachedComponentsList);
    },
    load: function(callback){
      getFromJson(function(jsonErr, jsonComponents){
        getFromDirectories(function(dirErr, dirComponents){
          if(dirErr){
            return returnError('components_list_get', dirErr, callback);
          } else if(jsonErr || !_.isEqual(dirComponents.components, jsonComponents.components)){
            saveData(dirComponents, function(saveErr){
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
    refresh: function(callback){
      clearTimeout(refreshLoop);
      getAndSaveFromDirectories(function(err, components){
        if(err){ return returnError('components_cache_refresh', err, callback); }
        cacheDataAndStartRefresh(components, callback);
      });
    }
  };
};