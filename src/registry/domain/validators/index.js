'use strict';

var semver = require('semver');
var _ = require('underscore');

var ocCliVersionValidator = require('./oc-cli-version');
var componentParametersValidator = require('./component-parameters');
var packageJsonValidator = require('./package-json-validator');
var pluginsRequirementsValidator = require('./plugins-requirements');
var registryConfigurationValidator = require('./registry-configuration');
var uploadedPackageValidator = require('./uploaded-package');
var nodeVersionValidator = require('./node-version');

module.exports = {
  validateComponentName: function(componentName){
    return !/[^a-zA-Z0-9\-\_]/.test(componentName) && componentName !== '_package';
  },
  validateComponentParameters: componentParametersValidator,
  validateNodeVersion: nodeVersionValidator,
  validateOcCliVersion: ocCliVersionValidator,
  validatePackage: uploadedPackageValidator,
  validatePackageJson: packageJsonValidator,
  validatePluginsRequirements: pluginsRequirementsValidator,
  validateRegistryConfiguration: registryConfigurationValidator,
  validateTemplateType: function(templateType){
    return _.contains(['handlebars', 'jade'], templateType);
  },
  validateVersion: function(version){
    return !!semver.valid(version);
  }
};
