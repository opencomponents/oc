/*
 * External Dependencies handler for webpack
 * Returns an array with handlers to indicates dependencies that should not be
 * bundled by webPack but instead remain requested by the resulting bundle.
 * For more info http://webpack.github.io/docs/configuration.html#externals
 *
*/
'use strict';

var _ = require('underscore');


module.exports = function externalDependenciesHandlers(dependencies){
  dependencies = dependencies || {}

  var missingExternalDependecy = function(dep, dependencies) {
    return !_.contains(_.keys(dependencies), dep);
  }

  return [
    function(context, request, callback) {
      console.log(request)
      if (/^[a-z@][a-z\-\/0-9]+$/.test(request)) {
        if(missingExternalDependecy(request, dependencies)) {
          console.log('BOOM, ' + request + ' doesnt exist on package.json')
        } else {
          console.log('coool')
        }

      }
      callback()
    },
    /^[a-z@][a-z\-\/0-9]+$/
  ]
};
