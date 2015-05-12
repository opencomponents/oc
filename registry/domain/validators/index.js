'use strict';

var componentParametersValidator = require('./component-parameters');
var registryConfigurationValidator = require('./registry-configuration');
var uploadedPackageValidator = require('./uploaded-package');

var semver = require('semver');
var _ = require('underscore');

module.exports = {
  validateComponentName: function(componentName){
    return !/[^a-zA-Z0-9\-\_]/.test(componentName) && componentName !== '_package';
  },
  validateTemplateType: function(templateType){
    return _.contains(['handlebars', 'jade'], templateType);
  },
  validateComponentParameters: componentParametersValidator,
  registryConfiguration: registryConfigurationValidator,
  validatePackage: uploadedPackageValidator,
  validateVersion: function(version){
    return !!semver.valid(version);
  }
};
