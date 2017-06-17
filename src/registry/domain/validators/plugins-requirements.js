'use strict';

const _ = require('lodash');

module.exports = function(componentRequirements, registryPlugins) {
  const result = { isValid: true },
    missing = [];

  _.forEach(componentRequirements || [], requiredPlugin => {
    if (
      !registryPlugins ||
      _.isEmpty(registryPlugins) ||
      !_.includes(_.keys(registryPlugins), requiredPlugin)
    ) {
      missing.push(requiredPlugin);
    }
  });

  if (!_.isEmpty(missing)) {
    return {
      isValid: false,
      missing: missing
    };
  }

  return result;
};
