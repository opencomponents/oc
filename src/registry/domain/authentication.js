'use strict';

var path = require('path');
var format = require('stringformat');

var strings = require('../../resources/');

var builtin = {
  basic: {
    validate: function(authConfig){
      var isValid = authConfig.username && authConfig.password;
      return {
          isValid: isValid,
          message: isValid ? '' : strings.errors.registry.CONFIGURATION_PUBLISH_BASIC_AUTH_CREDENTIALS_MISSING
      };
    },
    middleware: function(authConfig){
      var express = require('express');
      return express.basicAuth(authConfig.username, authConfig.password);
    }
  }
};

var scheme;

module.exports.validate = function(authConfig){
  if(builtin[authConfig.type]){
    scheme = builtin[authConfig.type];
  }
  else {
    var cwd = process.cwd();
    module.paths.push(cwd, path.join(cwd, 'node_modules'));

    var moduleName = 'oc-auth-' + authConfig.type;

    try {
      scheme = require(moduleName);
    } catch(err){
      return {
          isValid: false,
          message: format(strings.errors.registry.CONFIGURATION_PUBLISH_AUTH_MODULE_NOT_FOUND, moduleName)
      };
    }
  }

  return scheme.validate(authConfig);
};

module.exports.middleware = function(authConfig){
  return scheme.middleware(authConfig);
};
