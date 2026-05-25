import type { Request, Response } from 'express';
import strings from '../../resources/index';
import eventsHandler from '../domain/events-handler';
import extractPackage from '../domain/extract-package';
import type { Repository } from '../domain/repository';
import * as validator from '../domain/validators';
import { validateTemplateOcVersion } from '../domain/validators';

export default function publish(repository: Repository) {
  return async (req: Request, res: Response): Promise<void> => {
    if (!req.params['componentName'] || !req.params['componentVersion']) {
      res.errorDetails = 'malformed request';
      res.status(409).json({ error: res.errorDetails });
      return;
    }

    const packageValidation = validator.validatePackage(req.files);
    if (!packageValidation.isValid) {
      res.errorDetails = 'package is not valid';
      res.status(409).json({ error: res.errorDetails });
      return;
    }
    const files = packageValidation.files;

    const ocCliValidationResult = validator.validateOcCliVersion(
      req.headers['user-agent']
    );
    if (!ocCliValidationResult.isValid) {
      res.errorDetails = strings.errors.registry.OC_CLI_VERSION_IS_NOT_VALID(
        ocCliValidationResult.error.registryVersion,
        ocCliValidationResult.error.cliVersion
      );
      res.status(409).json({
        code: 'cli_version_not_valid',
        error: res.errorDetails,
        details: ocCliValidationResult.error
      });
      return;
    }

    const nodeValidationResult = validator.validateNodeVersion(
      req.headers['user-agent'],
      process.version
    );
    if (!nodeValidationResult.isValid) {
      res.errorDetails = strings.errors.registry.NODE_CLI_VERSION_IS_NOT_VALID(
        nodeValidationResult.error.registryNodeVersion,
        nodeValidationResult.error.cliNodeVersion
      );
      res.status(409).json({
        code: 'node_version_not_valid',
        error: res.errorDetails,
        details: nodeValidationResult.error
      });
      return;
    }

    try {
      const pkgDetails = await extractPackage(files, res.conf.tarExtractMode);

      if (pkgDetails.packageJson.oc.files.template.minOcVersion) {
        const templateOcVersionResult = validateTemplateOcVersion(
          pkgDetails.packageJson.oc.files.template.minOcVersion
        );
        if (!templateOcVersionResult.isValid) {
          res.errorDetails = `Your template requires a version of OC higher than ${templateOcVersionResult.error.minOcVersion}`;
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

      try {
        const componentName = req.params['componentName'];
        const componentVersion = req.params['componentVersion'];
        const dryRun = typeof req.query['dryRun'] !== 'undefined';

        await repository.publishComponent({
          pkgDetails,
          componentName,
          componentVersion,
          dryRun,
          user: req.user
        });

        if (!dryRun) {
          eventsHandler.fire('component-published', {
            componentName,
            componentVersion,
            packageJson: pkgDetails.packageJson,
            componentFolder: pkgDetails.outputFolder,
            user: req.user
          });
        }

        res.status(200).json({ ok: true });
      } catch (err: any) {
        let errorMessage = err.msg || err.message;

        if (res.conf.local) {
          errorMessage = JSON.stringify(err);
        }

        if (err.code === 'not_allowed') {
          res.errorDetails = `Publish not allowed: ${errorMessage}`;
          res.status(403).json({ error: err });
        } else if (err.code === 'already_exists') {
          res.errorDetails = `Component already exists: ${errorMessage}`;
          res.status(403).json({ error: err });
        } else if (err.code === 'name_not_valid') {
          res.errorDetails = `Component name not valid: ${errorMessage}`;
          res.status(409).json({ error: err });
        } else if (err.code === 'version_not_valid') {
          res.errorDetails = `Component version not valid: ${errorMessage}`;
          res.status(409).json({ error: err });
        } else {
          res.errorDetails = `Publish failed: ${errorMessage}`;
          res.status(500).json({ error: err });
        }
      }
    } catch (err) {
      res.errorDetails = `Package is not valid: ${err}`;
      res.status(500).json({ error: 'package is not valid', details: err });
    }
  };
}
