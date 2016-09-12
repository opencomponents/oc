'use strict';

var format = require('stringformat');

var extractPackage = require('../domain/extract-package');
var strings = require('../../resources/index');
var validator = require('../domain/validators');

module.exports = function(repository){

  return function(req, res){

    if(!req.params.componentName || !req.params.componentVersion){
      res.errorDetails = 'malformed request';
      return res.json(409, { error: res.errorDetails });
    }

    if(!validator.validatePackage(req.files).isValid){
      res.errorDetails = 'package is not valid';
      return res.json(409, { error: res.errorDetails });
    }

    var validationResult = validator.validateOcCliVersion(req.headers['user-agent']);
    if(!validationResult.isValid) {
      res.errorDetails = format(strings.errors.registry.OC_CLI_VERSION_IS_NOT_VALID, validationResult.error.registryVersion, validationResult.error.cliVersion);
      return res.json(409, {
        code: 'cli_version_not_valid',
        error: res.errorDetails,
        details: validationResult.error
      });
    }

    validationResult = validator.validateNodeVersion(req.headers['user-agent'], process.version);
    if(!validationResult.isValid) {
      res.errorDetails = format(strings.errors.registry.NODE_CLI_VERSION_IS_NOT_VALID, validationResult.error.registryNodeVersion, validationResult.error.cliNodeVersion);
      return res.json(409, {
        code: 'node_version_not_valid',
        error: res.errorDetails,
        details: validationResult.error
      });
    }

    extractPackage(req.files, function(err, pkgDetails){

      if(!!err){
        res.errorDetails = format('Package is not valid: {0}', err);
        return res.json(500, { error: 'package is not valid', details: err });
      }

      repository.publishComponent(pkgDetails, req.params.componentName, req.params.componentVersion, function(err, result){

        if(err){
          if(err.code === 'not_allowed'){
            res.errorDetails = format('Publish not allowed: {0}', err.msg);
            return res.json(403, { error: err.msg });
          } else if(err.code === 'already_exists'){
            res.errorDetails = format('Component already exists: {0}', err.msg);
            return res.json(403, { error: err.msg });
          } else if(err.code === 'name_not_valid'){
            res.errorDetails = format('Component name not valid: {0}', err.msg);
            return res.json(409, { error: err.msg });
          } else if(err.code === 'version_not_valid'){
            res.errorDetails = format('Component version not valid: {0}', err.msg);
            return res.json(409, { error: err.msg });
          } else {
            res.errorDetails = format('Publish failed: {0}', err.msg);
            return res.json(500, { error: err.msg });
          }
        }

        res.json(200, { ok: true });
      });
    });
  };
};
