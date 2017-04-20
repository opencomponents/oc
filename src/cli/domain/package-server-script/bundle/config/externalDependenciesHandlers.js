/*
 * External Dependencies handler for webpack
 * Returns an array with handlers to indicates dependencies that should not be
 * bundled by webPack but instead remain requested by the resulting bundle.
 * For more info http://webpack.github.io/docs/configuration.html#externals
 *
*/
'use strict';
const format = require('stringformat');
const _ = require('lodash');
const strings = require('../../../../../resources');


module.exports = function externalDependenciesHandlers(dependencies){
  const deps = dependencies || {};

  const missingExternalDependecy = function(dep, dependencies) {
    return !_.includes(_.keys(dependencies), dep);
  };

  return [
    function(context, req, callback) {
      if (/^[a-z@][a-z\-\/0-9]+$/i.test(req)) {
        let dependencyName = req;
        if (/\//g.test(dependencyName)) {
          dependencyName = dependencyName.substring(0, dependencyName.indexOf('/'));
        }
        if (missingExternalDependecy(dependencyName, deps)) {
          return callback(new Error(format(strings.errors.cli.SERVERJS_DEPENDENCY_NOT_DECLARED, JSON.stringify(dependencyName))));
        }
      }
      callback();
    },
    /^[a-z@][a-z\-\/0-9]+$/i
  ];
};
