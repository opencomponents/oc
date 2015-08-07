'use strict';

var format = require('stringformat');
var path = require('path');
var Targz = require('tar.gz');
var _ = require('underscore');

var RequireWrapper = require('../domain/require-wrapper');
var validator = require('../domain/validators');

module.exports = function(repository){

  var targz = new Targz();

  return function(req, res){

    if(!req.params.componentName || !req.params.componentVersion){
      res.errorDetails = 'malformed request';
      return res.json(409, { error: res.errorDetails });
    }

    if(!validator.validatePackage(req.files).isValid){
      res.errorDetails = 'package is not valid';
      return res.json(409, { error: res.errorDetails });
    }

    var files = req.files,
        packageFile = files[_.keys(files)[0]],
        packagePath = path.resolve(packageFile.path),
        packageUntarOutput = path.resolve(packageFile.path, '..', packageFile.name.replace('.tar.gz', '')),
        packageOutput = path.resolve(packageUntarOutput, '_package');

    targz.extract(packagePath, packageUntarOutput, function(err){

      if(!!err){
        res.errorDetails = format('Package file is not valid: {0}', err);
        return res.json(500, { error: 'package file is not valid', details: err });
      }

      repository.publishComponent(packageOutput, req.params.componentName, req.params.componentVersion, function(err, result){
        
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