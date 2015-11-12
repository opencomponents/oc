'use strict';

var fs = require('fs-extra');
var colors = require('colors');
var path = require('path');
var Targz = require('tar.gz');
var _ = require('underscore');

var getComponentsByDir = require('./get-components-by-dir');
var getLocalNpmModules = require('./get-local-npm-modules');
var link = require('./link');
var packageComponents = require('./package-components');
var settings = require('../../resources/settings');
var validator = require('../../registry/domain/validators');

module.exports = function(dependencies){
  var logger = dependencies.logger;
  var targz = new Targz();

  return _.extend(this, {
    cleanup: function(compressedPackagePath, callback){
      return fs.unlink(compressedPackagePath, callback);
    },
    compress: function(input, output, callback){
      return targz.compress(input, output, callback);
    },
    getComponentsByDir: getComponentsByDir(dependencies),
    getLocalNpmModules: getLocalNpmModules(),
    info: function(callback){
      return fs.readJson(settings.configFile.src, callback);
    },
    init: function(componentName, templateType, callback){

      if(!validator.validateComponentName(componentName)){
        return callback('name not valid');
      }

      if(!validator.validateTemplateType(templateType)){
        return callback('template type not valid');
      }

      try {

        var pathDir = '../../components/base-component-' + templateType,
            baseComponentDir = path.resolve(__dirname, pathDir),
            npmIgnorePath = path.resolve(__dirname, pathDir + '/.npmignore');

        fs.ensureDirSync(componentName);
        fs.copySync(baseComponentDir, componentName);
        fs.copySync(npmIgnorePath, componentName + '/.gitignore');

        var componentPath = path.resolve(componentName, 'package.json'),
          component = _.extend(fs.readJsonSync(componentPath), {
            name: componentName
          });

        fs.outputJsonSync(componentPath, component);

        return callback(null, { ok: true });
      } catch(e){
        return callback(e);
      }
    },
    link: link(),
    mock: function(params, callback){

      fs.readJson(settings.configFile.src, function(err, localConfig){

        localConfig = localConfig || {};

        var mockType = params.targetType + 's';

        if(!localConfig.mocks){
          localConfig.mocks = {};
        }

        if(!localConfig.mocks[mockType]){
          localConfig.mocks[mockType] = {};
        }

        var pluginType = 'static';
        if(fs.existsSync(path.resolve(params.targetValue))){
          pluginType = 'dynamic';
        }

        if(!localConfig.mocks[mockType][pluginType]){
          localConfig.mocks[mockType][pluginType] = {};
        }

        localConfig.mocks[mockType][pluginType][params.targetName] = params.targetValue;

        return fs.writeJson(settings.configFile.src, localConfig, {spaces: 2}, callback);
      });
    },
    package: packageComponents(),
    unlink: function(componentName, callback){
      fs.readJson(settings.configFile.src, function(err, localConfig){

        localConfig = localConfig || {};

        if(!!localConfig.components[componentName]){
          delete localConfig.components[componentName];
        }

        fs.writeJson(settings.configFile.src, localConfig, callback);
      });
    }
  });
};
