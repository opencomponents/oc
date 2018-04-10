'use strict';

const format = require('stringformat');

const extractPackage = require('../domain/extract-package');
const strings = require('../../resources/index');
const validator = require('../domain/validators');

module.exports = function(repository) {
  return function(req, res) {
    if (!req.params.componentName || !req.params.componentVersion) {
      res.errorDetails = 'malformed request';
      return res.status(409).json({ error: res.errorDetails });
    }

    if (!validator.validatePackage(req.files).isValid) {
      res.errorDetails = 'package is not valid';
      return res.status(409).json({ error: res.errorDetails });
    }

    let validationResult = validator.validateOcCliVersion(
      req.headers['user-agent']
    );
    if (!validationResult.isValid) {
      res.errorDetails = format(
        strings.errors.registry.OC_CLI_VERSION_IS_NOT_VALID,
        validationResult.error.registryVersion,
        validationResult.error.cliVersion
      );
      return res.status(409).json({
        code: 'cli_version_not_valid',
        error: res.errorDetails,
        details: validationResult.error
      });
    }

    validationResult = validator.validateNodeVersion(
      req.headers['user-agent'],
      process.version
    );
    if (!validationResult.isValid) {
      res.errorDetails = format(
        strings.errors.registry.NODE_CLI_VERSION_IS_NOT_VALID,
        validationResult.error.registryNodeVersion,
        validationResult.error.cliNodeVersion
      );
      return res.status(409).json({
        code: 'node_version_not_valid',
        error: res.errorDetails,
        details: validationResult.error
      });
    }

    extractPackage(req.files, (err, pkgDetails) => {
      if (err) {
        res.errorDetails = `Package is not valid: ${err}`;
        return res
          .status(500)
          .json({ error: 'package is not valid', details: err });
      }

      repository.publishComponent(
        pkgDetails,
        req.params.componentName,
        req.params.componentVersion,
        err => {
          if (err) {
            if (err.code === 'not_allowed') {
              res.errorDetails = `Publish not allowed: ${err.msg}`;
              return res.status(403).json({ error: err.msg });
            } else if (err.code === 'already_exists') {
              res.errorDetails = `Component already exists: ${err.msg}`;
              return res.status(403).json({ error: err.msg });
            } else if (err.code === 'name_not_valid') {
              res.errorDetails = `Component name not valid: ${err.msg}`;
              return res.status(409).json({ error: err.msg });
            } else if (err.code === 'version_not_valid') {
              res.errorDetails = `Component version not valid: ${err.msg}`;
              return res.status(409).json({ error: err.msg });
            } else {
              res.errorDetails = `Publish failed: ${err.msg}`;
              return res.status(500).json({ error: err.msg });
            }
          }

          res.status(200).json({ ok: true });
        }
      );
    });
  };
};
