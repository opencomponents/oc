'use strict';

var async = require('async');
var format = require('stringformat');
var fs = require('fs-extra');
var path = require('path');
var Targz = require('tar.gz');
var _ = require('underscore');

var getUnixUtcTimestamp = require('../../utils/get-unix-utc-timestamp');
var packageServerScript = require('./package-server-script');
var packageStaticFiles = require('./package-static-files');
var packageTemplate = require('./package-template');
var request = require('../../utils/request');
var settings = require('../../resources/settings');
var validator = require('../../registry/domain/validators');

module.exports = function(){

  var targz = new Targz();

  return _.extend(this, {
    cleanup: function(compressedPackagePath, callback){
      return fs.unlink(compressedPackagePath, callback);
    },
    compress: function(input, output, callback){
      return targz.compress(input, output, callback);
    },
    getComponentsByDir: function(componentsDir, callback){

      try {
        var components = fs.readdirSync(componentsDir).filter(function(file){

          var filePath = path.resolve(componentsDir, file),
              isDir = fs.lstatSync(filePath).isDirectory(),
              packagePath = path.join(filePath, 'package.json');

          if(!isDir || !fs.existsSync(packagePath)){
            return false;
          }

          var content = fs.readJsonSync(packagePath);

          if(!content.oc || !!content.oc.packaged){
            return false;
          }

          return true;
        });

        var fullPathComponents = _.map(components, function(component){
          return path.resolve(componentsDir, component);
        });

        callback(null, fullPathComponents);

      } catch(err){
        return callback(err);
      }
    },
    getLocalNpmModules: function(componentsDir){

      var nodeFolder = path.join(componentsDir, 'node_modules');

      if(!fs.existsSync(nodeFolder)){
        return [];
      }

      return fs.readdirSync(nodeFolder).filter(function(file){

        var filePath = path.resolve(nodeFolder, file),
            isBin = file === '.bin',
            isDir = fs.lstatSync(filePath).isDirectory();

        return isDir && !isBin;
      });
    },
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
    link: function(componentName, componentVersion, callback){

      fs.readJson(settings.configFile.src, function(err, localConfig){
        if(!localConfig || !localConfig.registries || localConfig.registries.length === 0){
          return callback('Registry configuration not found. Add a registry reference to the project first');
        }

        localConfig.components = localConfig.components || {};

        if(!!localConfig.components[componentName]){
          return callback('Component already linked in the project');
        }

        var componentHref = format('{0}/{1}/{2}', localConfig.registries[0], componentName, componentVersion);

        request(componentHref, function(err, res){
          if(err || !res){
            return callback('Component not available');
          }

          try {
            var apiResponse = JSON.parse(res);
            if(apiResponse.type !== 'oc-component'){
              return callback('not a valid oc Component');
            }
          } catch(e){
            return callback('not a valid oc Component');
          }

          localConfig.components[componentName] = componentVersion;
          fs.writeJson(settings.configFile.src, localConfig, callback);
        });
      });
    },
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
    package: function(componentPath, minify, callback){

      if(_.isFunction(minify)){
        callback = minify;
        minify = true;
      }

      var files = fs.readdirSync(componentPath),
          publishPath = path.join(componentPath, '_package');

      if(_.contains(files, '_package')){
        fs.removeSync(publishPath);
      }

      fs.mkdirSync(publishPath);

      var componentPackagePath = path.join(componentPath, 'package.json'),
          ocPackagePath = path.join(__dirname, '../../package.json');

      if(!fs.existsSync(componentPackagePath)){
        return callback('component does not contain package.json');
      } else if(!fs.existsSync(ocPackagePath)){
        return callback('error resolving oc internal dependencies');
      }

      var component = fs.readJsonSync(componentPackagePath),
          ocInfo = fs.readJsonSync(ocPackagePath);

      if(!validator.validateComponentName(component.name)){
        return callback('name not valid');
      }

      async.waterfall([
        function(cb){
          // Packaging template.js

          packageTemplate({
            componentName: component.name,
            componentPath: componentPath,
            ocOptions: component.oc,
            publishPath: publishPath
          }, function(err, packagedTemplateInfo){
            if(err){ return cb(err); }

            component.oc.files.template = packagedTemplateInfo;
            delete component.oc.files.client;
            cb(err, component);
          });
        },
        function(component, cb){
          // Packaging server.js

          if(!component.oc.files.data){
            return cb(null, component);
          }

          packageServerScript({
            componentPath: componentPath,
            dependencies: component.dependencies,
            ocOptions: component.oc,
            publishPath: publishPath
          }, function(err, packagedServerScriptInfo){
            if(err){ return cb(err); }

            component.oc.files.dataProvider = packagedServerScriptInfo;
            delete component.oc.files.data;
            cb(err, component);
          });
        },
        function(component, cb){
          // Packaging package.json

          component.oc.version = ocInfo.version;
          component.oc.packaged = true;
          component.oc.date = getUnixUtcTimestamp();

          if(!component.oc.files.static){
            component.oc.files.static = [];
          }

          if(!_.isArray(component.oc.files.static)){
            component.oc.files.static = [component.oc.files.static];
          }

          fs.writeJson(path.join(publishPath, 'package.json'), component, function(err, res){
            cb(err, component);
          });
        },
        function(component, cb){
          // Packaging static files
          packageStaticFiles({
            componentPath: componentPath,
            publishPath: publishPath,
            minify: minify,
            ocOptions: component.oc
          }, function(err, res){
            return cb(err, component);
          });
        }
      ], callback);
    },
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
