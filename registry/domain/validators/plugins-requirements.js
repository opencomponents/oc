'use strict';

var _ = require('underscore');

module.exports = function(componentRequirements, registryPlugins){
  var result = { isValid: true },
      missing = [];

  _.forEach(componentRequirements || [], function(requiredPlugin){
    if(!registryPlugins || _.isEmpty(registryPlugins) || !_.contains(_.keys(registryPlugins), requiredPlugin)){
      missing.push(requiredPlugin);
    }
  });

  if(!_.isEmpty(missing)){
    return {
      isValid: false,
      missing: missing
    };
  }

  return result;
};