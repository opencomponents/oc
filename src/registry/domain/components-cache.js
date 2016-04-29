'use strict';

var async = require('async');
var semver = require('semver');
var _ = require('underscore');

var eventsHandler = require('./events-handler');
var getUnixUTCTimestamp = require('../../utils/get-unix-utc-timestamp');

module.exports = function(conf, cdn){

  var cachedComponentsList,
      refreshLoop;

  var cacheDataAndStartRefresh = function(data, cb){
    eventsHandler.fire('cache-poll', getUnixUTCTimestamp());
    cachedComponentsList = data;
    refreshCachedData();
    cb(null, data);
  };

  var getAndSaveFromDirectories = function(cb){ 
    getFromDirectories(function(err, components){
      if(!!err){ return cb(err); }
      saveData(components, function(err, res){
        if(!!err){ return cb(err); }
        cb(err, components);
      }); 
    });
  };

  var getFromDirectories = function(cb){
    var componentsInfo = {},
        self = this;

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
        if(!!errors){ return cb(errors); }

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

  var getFromJson = function(cb){
    cdn.getFile(conf.s3.componentsDir + '/components.json', true, function(err, res){
      var result; 
      
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

  var getVersionsForComponent  = function(componentName, cb){
    cdn.listSubDirectories(conf.s3.componentsDir + '/' + componentName, function(err, versions){
      if(err){ return cb(err); }
      cb(null, versions.sort(semver.compare));
    });
  };

  var refreshCachedData = function(){
    refreshLoop = setInterval(function(){
      getFromJson(function(err, data){
        if(err){
          eventsHandler.fire('error', { code: 'components_list_get', message: err });
        } else {
          updateCachedData(data);
        }
      });
    }, conf.pollingInterval * 1000);
  };

  var returnError = function(errorCode, errorMessage, callback){
    eventsHandler.fire('error', { code: errorCode, message: errorMessage });
    return callback(errorCode);
  };

  var saveData = function(data, callback){
    cdn.putFileContent(JSON.stringify(data), conf.s3.componentsDir + '/components.json', true, callback);
  };

  var updateCachedData = function(newData){
    eventsHandler.fire('cache-poll', getUnixUTCTimestamp());
    if(newData.lastEdit > cachedComponentsList.lastEdit){
      cachedComponentsList = newData;
    }
  };

  return {
    get: function(callback){
      if(!cachedComponentsList){ return returnError('components_cache_empty', 'The component\'s cache was empty', callback); }
      callback(null, cachedComponentsList);
    },
    load: function(callback){
      getFromJson(function(jsonErr, jsonComponents){
        getFromDirectories(function(dirErr, dirComponents){
          if(!!dirErr){
            return returnError('components_list_get', dirErr, callback);
          } else if(jsonErr || !_.isEqual(dirComponents.components, jsonComponents.components)){
            saveData(dirComponents, function(saveErr, saveResult){
              if(!!saveErr){
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
      clearInterval(refreshLoop);
      getAndSaveFromDirectories(function(err, components){
        if(!!err){ return returnError('components_cache_refresh', err, callback); }
        cacheDataAndStartRefresh(components, callback);
      });
    }
  };
};