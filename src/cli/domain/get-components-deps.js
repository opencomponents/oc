'use strict';

var fs = require('fs-extra');
var path = require('path');
var _ =  require('underscore');

module.exports = function(components){
  var deps = [];
  _.forEach(components, function(c){
    var pkg = fs.readJsonSync(path.join(c, 'package.json'));
    _.forEach(_.keys(pkg.dependencies), function(d){
      if(!_.contains(deps, d)){
        deps.push(d);
      }
    });
  });

  return deps;
};