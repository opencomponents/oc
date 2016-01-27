'use strict';

var _ = require('./utils/helpers');

module.exports = {
  validateConfiguration: function(conf){
    var errorMessage = function(msg){
      return {
        isValid: false,
        error: 'Configuration is not valid: ' + msg
      };
    };

    if(!!conf.registries && _.isArray(conf.registries)){
      return errorMessage('registries must be an object');
    } else if(!!conf.registries && !conf.registries.serverRendering && !conf.clientRendering){
      return errorMessage('registries must contain at least one endpoint');
    }

    return { isValid: true };
  }
};