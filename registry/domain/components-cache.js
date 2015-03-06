'use strict';

var getUnixUTCTimestamp = require('../../utils/get-unix-utc-timestamp');
var giveMe = require('give-me');
var semver = require('semver');
var _ = require('underscore');

module.exports = function(conf, cdn){

  var cachedComponentsList,
      refreshLoop;

  var cacheDataAndStartRefresh = function(data, cb){
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
    cdn.getFile(conf.s3.componentsDir + '/components.json', function(err, res){
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
    if(newData.lastEdit > cachedComponentsList.lastEdit){
      cachedComponentsList = newData;
    }
  };

  return {
    get: function(callback){
      if(!cachedComponentsList){ return callback('components_cache_empty'); }
      callback(null, cachedComponentsList);
    },
    load: function(callback){
      getFromJson(function(err, components){

        if(!!err){
          getAndSaveFromDirectories(function(err, components){
            if(!!err){ return callback(err); }
            cacheDataAndStartRefresh(components, callback);
          });
        } else {
          cacheDataAndStartRefresh(components, callback);
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