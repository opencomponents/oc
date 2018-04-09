'use strict';

const basicAuth = require('basic-auth-connect');
const format = require('stringformat');
const path = require('path');

const strings = require('../../resources/');

const builtin = {
  basic: {
    validate: function(authConfig) {
      const isValid = authConfig.username && authConfig.password;
      return {
        isValid,
        message: isValid
          ? ''
          : strings.errors.registry
            .CONFIGURATION_PUBLISH_BASIC_AUTH_CREDENTIALS_MISSING
      };
    },
    middleware: function(authConfig) {
      return basicAuth(authConfig.username, authConfig.password);
    }
  }
};

let scheme;

module.exports.validate = function(authConfig) {
  if (builtin[authConfig.type]) {
    scheme = builtin[authConfig.type];
  } else {
    const cwd = process.cwd();
    module.paths.push(cwd, path.join(cwd, 'node_modules'));

    const moduleName = `oc-auth-${authConfig.type}`;

    try {
      scheme = require(moduleName);
    } catch (err) {
      return {
        isValid: false,
        message: format(
          strings.errors.registry.CONFIGURATION_PUBLISH_AUTH_MODULE_NOT_FOUND,
          moduleName
        )
      };
    }
  }

  return scheme.validate(authConfig);
};

module.exports.middleware = function(authConfig) {
  return scheme.middleware(authConfig);
};
