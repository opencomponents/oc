import semver from 'semver';

import componentParametersValidator from './component-parameters';
import nodeVersionValidator from './node-version';
import ocCliVersionValidator from './oc-cli-version';
import packageJsonValidator from './package-json-validator';
import pluginsRequirementsValidator from './plugins-requirements';
import registryConfigurationValidator from './registry-configuration';
import templateOcVersionValidator from './templace-oc-version';
import uploadedPackageValidator from './uploaded-package';

export function validateComponentName(componentName: string): boolean {
  return !/[^a-zA-Z0-9\-_]/.test(componentName) && componentName !== '_package';
}
export const validateComponentParameters = componentParametersValidator;
export const validateNodeVersion = nodeVersionValidator;
export const validateOcCliVersion = ocCliVersionValidator;
export const validatePackage = uploadedPackageValidator;
export const validatePackageJson = packageJsonValidator;
export const validatePluginsRequirements = pluginsRequirementsValidator;
export const validateRegistryConfiguration = registryConfigurationValidator;
export const validateTemplateOcVersion = templateOcVersionValidator;

export function validateVersion(version: string): boolean {
  return !!semver.valid(version);
}
