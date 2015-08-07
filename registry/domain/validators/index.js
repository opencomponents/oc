'use strict';

var semver = require('semver');
var _ = require('underscore');

var componentParametersValidator = require('./component-parameters');
var pluginsRequirementsValidator = require('./plugins-requirements');
var registryConfigurationValidator = require('./registry-configuration');
var uploadedPackageValidator = require('./uploaded-package');

module.exports = {
  validateComponentName: function(componentName){
    return !/[^a-zA-Z0-9\-\_]/.test(componentName) && componentName !== '_package';
  },
  validateComponentParameters: componentParametersValidator,
  validatePackage: uploadedPackageValidator,
  validatePluginsRequirements: pluginsRequirementsValidator,
  validateRegistryConfiguration: registryConfigurationValidator,
  validateTemplateType: function(templateType){
    return _.contains(['handlebars', 'jade'], templateType);
  },
  validateVersion: function(version){
    return !!semver.valid(version);
  }
};
