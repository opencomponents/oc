'use strict';

const _ = require('underscore');

const ComponentsDetails = require('./components-details');
const ComponentsList = require('./components-list');
const eventsHandler = require('../events-handler');
const getUnixUTCTimestamp = require('../../../utils/get-unix-utc-timestamp');

module.exports = function(conf, cdn){

  let cachedComponentsList, refreshLoop;

  const componentsList = ComponentsList(conf, cdn);
  const componentsDetails = ComponentsDetails(conf, cdn);

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
    refreshLoop = poll();
    callback(null, data);
  };

  const returnError = (code, message, callback) => {
    eventsHandler.fire('error', { code, message });
    return callback(code);
  };

  return {
    get: (callback) => {
      if(!cachedComponentsList){
        return returnError('components_cache_empty', `The component's cache was empty`, callback);
      }

      callback(null, cachedComponentsList);
    },

    getDetails: (callback) => componentsDetails.getFromJson(callback),
    
    load: (callback) => {

      const verifyDetailsIntegrity = (componentsList) => {
        const next = () => cacheDataAndStartPolling(componentsList, callback);

        componentsDetails.getFromJson((jsonErr, jsonDetails) => {
          componentsDetails.getFromDirectories(componentsList.components, jsonDetails, (dirErr, dirDetails) => {

            if(dirErr){
              return returnError('components_details_get', dirErr, callback);
            } else if(jsonErr || !_.isEqual(dirDetails.components, jsonDetails.components)){
              componentsDetails.save(dirDetails, (saveErr) => {
                if(saveErr){
                  return returnError('components_details_save', saveErr, callback);
                }

                next();
              });
            } else {
              next();
            }
          });
        });
      };

      componentsList.getFromJson((jsonErr, jsonComponents) => {
        componentsList.getFromDirectories((dirErr, dirComponents) => {
          if(dirErr){
            return returnError('components_list_get', dirErr, callback);
          } else if(jsonErr || !_.isEqual(dirComponents.components, jsonComponents.components)){
            componentsList.save(dirComponents, (saveErr) => {
              if(saveErr){
                return returnError('components_list_save', saveErr, callback);
              }
              verifyDetailsIntegrity(dirComponents);
            });
          } else {
            verifyDetailsIntegrity(jsonComponents);
          }
        });
      });
    },
    refresh: (callback) => {
      clearTimeout(refreshLoop);
      componentsList.refresh((err, components) => {
        if(err){
          return returnError('components_cache_refresh', err, callback);
        }
        cacheDataAndStartPolling(components, callback);
      });
    }
  };
};
