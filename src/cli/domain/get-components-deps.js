'use strict';

var fs = require('fs-extra');
var path = require('path');
var _ =  require('underscore');

module.exports = function(components){
  var deps = { modules: {}, withVersions: {}, templates: {} };

  var legacyTemplates = {
    'jade': true,
    'handlebars': true
  };

  components.forEach(function(c){
    var pkg = fs.readJsonSync(path.join(c, 'package.json'));
    var type = pkg.oc.files.template.type;
    var dependencies = pkg.dependencies;

    if (!deps.templates[type] && !legacyTemplates[type]) {
      deps.templates[type] = true;
    }

    _.keys(dependencies).forEach(function(name){
      var version = dependencies[name];
      var depToInstall = version.length > 0
        ? (name + '@' + version)
        : name;

      if (!deps.withVersions[depToInstall]) {
        deps.withVersions[depToInstall] = true;
      }

      if (!deps.modules[name]) {
        deps.modules[name] = true;
      }
    });
  });

  return {
    modules: _.keys(deps.modules),
    withVersions: _.keys(deps.withVersions),
    templates: _.keys(deps.templates)
  };
};
