import type { Request, Response } from 'express';
import strings from '../../resources/index';
import * as validator from '../domain/validators';
import { validateTemplateOcVersion } from '../domain/validators';

export default function validate() {
  return async (req: Request, res: Response): Promise<void> => {
    // Validate that request has a JSON body with package.json
    if (!req.body || !req.body.packageJson) {
      res.status(400).json({
        error: 'Invalid request: packageJson is required in request body'
      });
      return;
    }

    const packageJson = req.body.packageJson;

    // Get component name and version from package.json or URL params
    const componentName = req.params['componentName'] || packageJson.name;
    const componentVersion =
      req.params['componentVersion'] || packageJson.version;

    if (!componentName || !componentVersion) {
      res.status(400).json({
        error:
          'Component name and version are required (either in URL params or package.json)'
      });
      return;
    }

    // Validate component name format
    if (!validator.validateComponentName(componentName)) {
      res.status(409).json({
        code: 'name_not_valid',
        error: 'Component name is not valid'
      });
      return;
    }

    // Validate version format
    if (!validator.validateVersion(componentVersion)) {
      res.status(409).json({
        code: 'version_not_valid',
        error: 'Component version is not valid'
      });
      return;
    }

    // Validate OC CLI version (if provided in headers)
    if (req.headers['user-agent']) {
      const ocCliValidationResult = validator.validateOcCliVersion(
        req.headers['user-agent']
      );
      if (!ocCliValidationResult.isValid) {
        res.status(409).json({
          code: 'cli_version_not_valid',
          error: strings.errors.registry.OC_CLI_VERSION_IS_NOT_VALID(
            ocCliValidationResult.error.registryVersion,
            ocCliValidationResult.error.cliVersion
          ),
          details: ocCliValidationResult.error
        });
        return;
      }

      // Validate Node version
      const nodeValidationResult = validator.validateNodeVersion(
        req.headers['user-agent'],
        process.version
      );
      if (!nodeValidationResult.isValid) {
        res.status(409).json({
          code: 'node_version_not_valid',
          error: strings.errors.registry.NODE_CLI_VERSION_IS_NOT_VALID(
            nodeValidationResult.error.registryNodeVersion,
            nodeValidationResult.error.cliNodeVersion
          ),
          details: nodeValidationResult.error
        });
        return;
      }
    }

    // Validate package.json structure and content
    try {
      // Check if package name matches component name
      if (packageJson.name !== componentName) {
        res.status(409).json({
          code: 'name_mismatch',
          error: strings.errors.registry.COMPONENT_PUBLISHNAME_CONFLICT
        });
        return;
      }

      // Validate package.json with custom validator if available
      if (res.conf.publishValidation) {
        const pkgDetails = {
          componentName,
          packageJson,
          context: {},
          customValidator: res.conf.publishValidation
        };

        const packageValidationResult =
          validator.validatePackageJson(pkgDetails);
        if (!packageValidationResult.isValid) {
          res.status(409).json({
            code: 'package_not_valid',
            error: packageValidationResult.error || 'Package validation failed'
          });
          return;
        }
      }

      // Validate template OC version if specified
      if (packageJson.oc?.files?.template?.minOcVersion) {
        const templateOcVersionResult = validateTemplateOcVersion(
          packageJson.oc.files.template.minOcVersion
        );
        if (!templateOcVersionResult.isValid) {
          res.status(409).json({
            code: 'template_oc_version_not_valid',
            error: strings.errors.cli.TEMPLATE_OC_VERSION_NOT_VALID(
              templateOcVersionResult.error.minOcVersion,
              templateOcVersionResult.error.registryVersion
            ),
            details: templateOcVersionResult.error
          });
          return;
        }
      }

      // If all validations pass, return success
      res.status(200).json({
        valid: true,
        message: 'Package validation successful'
      });
    } catch (err: any) {
      res.status(400).json({
        code: 'validation_error',
        error: 'Package validation failed',
        details: err.message || err
      });
    }
  };
}
