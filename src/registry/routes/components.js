'use strict';

const async = require('async');
const format = require('stringformat');
const _ = require('lodash');

const GetComponentHelper = require('./helpers/get-component');
const strings = require('../../resources');

module.exports = function(conf, repository) {
  const getComponent = new GetComponentHelper(conf, repository);

  return function(req, res) {
    const components = req.body.components,
      registryErrors = strings.errors.registry;

    const returnError = function(message) {
      return res.status(400).json({
        code: registryErrors.BATCH_ROUTE_BODY_NOT_VALID_CODE,
        error: format(registryErrors.BATCH_ROUTE_BODY_NOT_VALID, message)
      });
    };

    if (!components) {
      return returnError(
        registryErrors.BATCH_ROUTE_COMPONENTS_PROPERTY_MISSING
      );
    } else if (!_.isArray(components)) {
      return returnError(registryErrors.BATCH_ROUTE_COMPONENTS_NOT_ARRAY);
    }

    if (!_.isEmpty(components)) {
      const errors = _.compact(
        _.map(components, (component, index) => {
          if (!component.name) {
            return format(
              registryErrors.BATCH_ROUTE_COMPONENT_NAME_MISSING,
              index
            );
          }
        })
      );

      if (!_.isEmpty(errors)) {
        return returnError(errors.join(', '));
      }
    }

    async.map(
      components,
      (component, callback) => {
        getComponent(
          {
            conf: res.conf,
            name: component.name,
            headers: req.headers,
            omitHref: !!req.body.omitHref,
            parameters: _.extend({}, req.body.parameters, component.parameters),
            version: component.version
          },
          result => callback(null, result)
        );
      },
      (err, results) => res.status(200).json(results)
    );
  };
};
