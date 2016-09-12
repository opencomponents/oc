'use strict';

var fs = require('fs-extra');
var path = require('path');
var _ =  require('underscore');

module.exports = function(components){

  var deps = { modules: [], withVersions: [] };

  _.forEach(components, function(c){

    var pkg = fs.readJsonSync(path.join(c, 'package.json'));

    _.forEach(_.keys(pkg.dependencies), function(d){

      var version = pkg.dependencies[d],
          hasVersion = !_.isEmpty(version),
          depToInstall = hasVersion ? (d + '@' + version) : d;

      if(!_.contains(deps.withVersions, depToInstall)){
        deps.withVersions.push(depToInstall);
      }

      if(!_.contains(deps.modules, d)){
        deps.modules.push(d);
      }
    });
  });

  return deps;
};
