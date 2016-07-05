'use strict';

var _ = require('underscore');

var strings = require('../../../resources');

module.exports = function(pkgDetails){

  if(pkgDetails.packageJson.name !== pkgDetails.componentName){
    return {
      isValid: false,
      error: strings.errors.registry.COMPONENT_PUBLISHNAME_CONFLICT
    };
  }

  var result = pkgDetails.customValidator(pkgDetails.packageJson);
  
  if(_.isBoolean(result)){
    result = { isValid: result };

    if(!result.isValid){
      result.error = 'unknown';
    }
  }

  return result;
};