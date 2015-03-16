'use strict';

var getUnixUTCTimestamp = require('../../utils/get-unix-utc-timestamp');
var giveMe = require('give-me');
var semver = require('semver');
var _ = require('underscore');

module.exports = function(conf, cdn){

  var cachedComponentsList,
      refreshLoop,
      _eventsHandler;

  var cacheDataAndStartRefresh = function(data, cb){
    _eventsHandler.fire('cache-poll', getUnixUTCTimestamp());
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
      if(err){ return cb(err); }

      giveMe.all(getVersionsForComponent, _.map(components, function(component){
        return [component];
      }), function(errors, versions){

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
      if(err){ return cb(err); }
      cb(err, JSON.parse(res));
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
        if(!err){
          updateCachedData(data);
        }
      });
    }, conf.pollingInterval * 1000);
  };

  var saveData = function(data, callback){
    cdn.putFileContent(JSON.stringify(data), conf.s3.componentsDir + '/components.json', true, callback);
  };

  var updateCachedData = function(newData){
    _eventsHandler.fire('cache-poll', getUnixUTCTimestamp());
    if(newData.lastEdit > cachedComponentsList.lastEdit){
      cachedComponentsList = newData;
    }
  };

  return {
    get: function(callback){
      if(!cachedComponentsList){ return callback('components_cache_empty'); }
      callback(null, cachedComponentsList);
    },
    load: function(eventsHandler, callback){
      _eventsHandler = eventsHandler;

      giveMe.all([getFromJson, getFromDirectories], function(errors, components){
        if(!!errors && !!errors[1]){ 
          return callback(errors[1]); 
        } else if((!!errors && !!errors[0]) || !_.isEqual(components[0].components, components[1].components)){ 
          saveData(components[1], function(saveErr, saveResult){
            if(!!saveErr){ return callback(saveErr); }
            cacheDataAndStartRefresh(components[1], callback);
          });
        } else {
          cacheDataAndStartRefresh(components[0], callback);
        }
      });
    },
    refresh: function(callback){
      clearInterval(refreshLoop);
      getAndSaveFromDirectories(function(err, components){
        if(!!err){ return callback(err); }
        cacheDataAndStartRefresh(components, callback);
      });
    }
  };
};