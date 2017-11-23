'use strict';

const format = require('stringformat');
const _ = require('lodash');

const auth = require('../authentication');
const strings = require('../../../resources');

module.exports = function(conf) {
  const response = { isValid: true };

  const returnError = function(message) {
    response.isValid = false;
    response.message = message || 'registry configuration is not valid';
    return response;
  };

  if (!conf || !_.isObject(conf) || _.keys(conf).length === 0) {
    return returnError(strings.errors.registry.CONFIGURATION_EMPTY);
  }

  const prefix = conf.prefix;

  if (prefix) {
    if (prefix.substr(0, 1) !== '/') {
      return returnError(
        strings.errors.registry.CONFIGURATION_PREFIX_DOES_NOT_START_WITH_SLASH
      );
    }

    if (prefix.substr(prefix.length - 1) !== '/') {
      return returnError(
        strings.errors.registry.CONFIGURATION_PREFIX_DOES_NOT_END_WITH_SLASH
      );
    }
  }

  const publishAuth = conf.publishAuth;

  if (publishAuth) {
    const res = auth.validate(publishAuth);
    if (!res.isValid) {
      return returnError(res.message);
    }
  }

  const dependencies = conf.dependencies;

  if (!!dependencies && !_.isArray(dependencies)) {
    return returnError(
      strings.errors.registry.CONFIGURATION_DEPENDENCIES_MUST_BE_ARRAY
    );
  }

  const routes = conf.routes;

  if (!!routes && !_.isArray(routes)) {
    return returnError(
      strings.errors.registry.CONFIGURATION_ROUTES_MUST_BE_ARRAY
    );
  } else {
    _.forEach(routes, route => {
      if (!route.route || !route.handler || !route.method) {
        return returnError(
          strings.errors.registry.CONFIGURATION_ROUTES_NOT_VALID
        );
      }

      if (!_.isFunction(route.handler)) {
        return returnError(
          strings.errors.registry.CONFIGURATION_ROUTES_HANDLER_MUST_BE_FUNCTION
        );
      }

      if (route.route.indexOf(prefix) === 0) {
        return returnError(
          format(
            strings.errors.registry.CONFIGURATION_ROUTES_ROUTE_CONTAINS_PREFIX,
            prefix
          )
        );
      }
    });
  }

  if (!conf.local && !conf.storage) {
    // S3 settings should either specify both key/secret or
    // skip both when leveraging IAM Role based S3 access from EC2
    if (
      !conf.s3 ||
      !conf.s3.bucket ||
      !conf.s3.region ||
      (conf.s3.key && !conf.s3.secret) ||
      (!conf.s3.key && conf.s3.secret)
    ) {
      return returnError(
        format(strings.errors.registry.CONFIGURATION_STORAGE_NOT_VALID, 'S3')
      );
    }
  }

  if (!conf.local && conf.storage) {
    if (!conf.storage.adapter) {
      //required since this is done before the options-sanitiser
      conf.storage.adapter = require('oc-s3-storage-adapter');
    }
    const cdn = conf.storage.adapter(conf.storage.options);
    if (cdn.adapterType === 's3') {
      if (
        !conf.storage.options.bucket ||
        !conf.storage.options.region ||
        (conf.storage.options.key && !conf.storage.options.secret) ||
        (!conf.storage.options.key && conf.storage.options.secret)
      ) {
        return returnError(
          format(
            strings.errors.registry.CONFIGURATION_STORAGE_NOT_VALID,
            conf.storage.adapterType.toUpperCase()
          )
        );
      }
    }
  }

  if (conf.customHeadersToSkipOnWeakVersion) {
    if (!_.isArray(conf.customHeadersToSkipOnWeakVersion)) {
      return returnError(
        strings.errors.registry
          .CONFIGURATION_HEADERS_TO_SKIP_MUST_BE_STRING_ARRAY
      );
    }

    const hasNonStringElements = conf.customHeadersToSkipOnWeakVersion.find(
      element => typeof element !== 'string'
    );

    if (hasNonStringElements) {
      return returnError(
        strings.errors.registry
          .CONFIGURATION_HEADERS_TO_SKIP_MUST_BE_STRING_ARRAY
      );
    }
  }

  return response;
};
