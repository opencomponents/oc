'use strict';

const coreModules = require('builtin-modules');
const format = require('stringformat');
const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');

const settings = require('../../resources');

module.exports = function(components) {
  const deps = { modules: {}, withVersions: {}, templates: {} };

  const legacyTemplates = {
    jade: true,
    handlebars: true
  };

  components.forEach(componentPath => {
    const pkg = fs.readJsonSync(path.join(componentPath, 'package.json'));
    const type = pkg.oc.files.template.type;
    const dependencies = pkg.dependencies || {};
    const devDependencies = pkg.devDependencies || {};
    const templateCompiler = type + '-compiler';

    if (!deps.templates[type] && !legacyTemplates[type]) {
      if (!devDependencies[templateCompiler]) {
        throw new Error(
          format(settings.errors.cli.TEMPLATE_DEP_MISSING, componentPath, type)
        );
      }
      deps.templates[type] = true;
      dependencies[templateCompiler] = devDependencies[templateCompiler];
    }

    _.keys(dependencies).forEach(name => {
      const version = dependencies[name];
      const depToInstall = version.length > 0 ? `${name}@${version}` : name;

      if (!deps.withVersions[depToInstall]) {
        deps.withVersions[depToInstall] = true;
      }

      if (!deps.modules[name]) {
        deps.modules[name] = true;
      }
    });
  });

  return {
    modules: _.union(coreModules, _.keys(deps.modules)),
    withVersions: _.keys(deps.withVersions),
    templates: _.keys(deps.templates)
  };
};
