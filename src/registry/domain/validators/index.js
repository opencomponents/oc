'use strict';

const semver = require('semver');
const _ = require('lodash');

const ocCliVersionValidator = require('./oc-cli-version');
const componentParametersValidator = require('./component-parameters');
const packageJsonValidator = require('./package-json-validator');
const pluginsRequirementsValidator = require('./plugins-requirements');
const registryConfigurationValidator = require('./registry-configuration');
const uploadedPackageValidator = require('./uploaded-package');
const nodeVersionValidator = require('./node-version');

module.exports = {
  validateComponentName: function(componentName) {
    return (
      !/[^a-zA-Z0-9\-\_]/.test(componentName) && componentName !== '_package'
    );
  },
  validateComponentParameters: componentParametersValidator,
  validateNodeVersion: nodeVersionValidator,
  validateOcCliVersion: ocCliVersionValidator,
  validatePackage: uploadedPackageValidator,
  validatePackageJson: packageJsonValidator,
  validatePluginsRequirements: pluginsRequirementsValidator,
  validateRegistryConfiguration: registryConfigurationValidator,
  validateVersion: function(version) {
    return !!semver.valid(version);
  }
};
