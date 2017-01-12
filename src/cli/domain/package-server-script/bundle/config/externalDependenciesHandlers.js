/*
 * External Dependencies handler for webpack
 * Returns an array with handlers to indicates dependencies that should not be
 * bundled by webPack but instead remain requested by the resulting bundle.
 * For more info http://webpack.github.io/docs/configuration.html#externals
 *
*/
'use strict';
var format = require('stringformat');
var _ = require('underscore');
var strings = require('../../../../../resources');


module.exports = function externalDependenciesHandlers(dependencies){
  var deps = dependencies || {}

  var missingExternalDependecy = function(dep, dependencies) {
    return !_.contains(_.keys(dependencies), dep);
  }

  return [
    function(context, req, callback) {
      if (/^[a-z@][a-z\-\/0-9]+$/.test(req)) {
        var dependencyName = req;
        if (/\//g.test(dependencyName)) {
          dependencyName = dependencyName.substring(0, dependencyName.indexOf("/"));
        }
        if (missingExternalDependecy(dependencyName, deps)) {
          return callback(new Error(format(strings.errors.cli.SERVERJS_DEPENDENCY_NOT_DECLARED, JSON.stringify(dependencyName))));
        }
      }
      callback()
    },
    /^[a-z@][a-z\-\/0-9]+$/
  ]
};


