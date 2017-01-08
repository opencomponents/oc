'use strict';

var _ = require('underscore');

var missingDependencies = function(requires, dependencies){
  return _.filter(requires, function(dep){
    return !_.contains(_.keys(dependencies), dep);
  });
};

module.exports = missingDependencies;
