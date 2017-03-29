'use strict';

var format = require('stringformat');
var fs = require('fs-extra');
var path = require('path');
var _ = require('underscore');

var ComponentsCache = require('./components-cache');
var packageInfo = require('../../../package.json');
var S3 = require('./s3');
var settings = require('../../resources/settings');
var strings = require('../../resources');
var validator = require('./validators');
var versionHandler = require('./version-handler');

module.exports = function(conf){

  var cdn = !conf.local && new S3(conf),
      repositorySource = conf.local ? 'local repository' : 's3 cdn',
      componentsCache = new ComponentsCache(conf, cdn);

  var getFilePath = function(component, version, filePath){
    return format('{0}/{1}/{2}/{3}', conf.s3.componentsDir, component, version, filePath);
  };

  var coreTemplates = ['oc-template-jade', 'oc-template-handlebars'];
  var templates = _.union(coreTemplates, conf.templates)
    .map(function(template){
      var info;
      try {
        info = require(template).getInfo();
      } catch (err) {
        throw new Error(format(strings.errors.registry.TEMPLATE_NOT_FOUND, template));
      }
      return {
        type: info.type,
        version: info.version,
        externals: info.externals
      };
    });
  
  var local = {
    getCompiledView: function(componentName, componentVersion){
      if(componentName === 'oc-client'){
        return fs.readFileSync(path.join(__dirname, '../../components/oc-client/_package/template.js')).toString();
      }

      return fs.readFileSync(path.join(conf.path, componentName + '/_package/template.js')).toString();
    },
    getComponents: function(){ 

      var validComponents = fs.readdirSync(conf.path).filter(function(file){
        var isDir = fs.lstatSync(path.join(conf.path, file)).isDirectory(),
            isValidComponent = isDir ? (fs.readdirSync(path.join(conf.path, file)).filter(function(file){
              return file === '_package';
            }).length === 1) : false;

        return isValidComponent;
      });

      validComponents.push('oc-client');
      return validComponents;
    }, 
    getComponentVersions: function(componentName, callback){
      if(componentName === 'oc-client'){
        return callback(null, [fs.readJsonSync(path.join(__dirname, '../../../package.json')).version]);
      }

      if(!_.contains(local.getComponents(), componentName)){
        return callback(format(strings.errors.registry.COMPONENT_NOT_FOUND, componentName, repositorySource));
      }

      callback(null, [fs.readJsonSync(path.join(conf.path, componentName + '/package.json')).version]);
    },
    getDataProvider: function(componentName){
      if(componentName === 'oc-client'){
        return fs.readFileSync(path.join(__dirname, '../../components/oc-client/_package/server.js')).toString();
      }

      return fs.readFileSync(path.join(conf.path, componentName + '/_package/server.js')).toString();
    }
  };
  

  return {
    getCompiledView: function(componentName, componentVersion, callback){
      if(conf.local){
        return callback(null, local.getCompiledView(componentName, componentVersion));
      }

      cdn.getFile(getFilePath(componentName, componentVersion, 'template.js'), callback);
    },
    getComponent: function(componentName, componentVersion, callback){

      var self = this;

      if(typeof(componentVersion) === 'function'){
        callback = componentVersion;
        componentVersion = undefined;
      }

      this.getComponentVersions(componentName, function(err, availableVersions){
        
        if(err){
          return callback(err);
        }

        if(availableVersions.length === 0){
          return callback(format(strings.errors.registry.COMPONENT_NOT_FOUND, componentName, repositorySource));
        }

        var version = versionHandler.getAvailableVersion(componentVersion, availableVersions);

        if(!version){
          return callback(format(strings.errors.registry.COMPONENT_VERSION_NOT_FOUND, componentName, componentVersion, repositorySource));
        }

        self.getComponentInfo(componentName, version, function(err, component){
          if(err){
            return callback('component not available: ' + err, null);
          }
          callback(null, _.extend(component, {
            allVersions: availableVersions
          }));
        });
      });
    },
    getComponentInfo: function(componentName, componentVersion, callback){
      if(conf.local){
        var componentInfo;

        if(componentName === 'oc-client'){
          componentInfo = fs.readJsonSync(path.join(__dirname, '../../components/oc-client/_package/package.json'));
        } else {
          componentInfo = fs.readJsonSync(path.join(conf.path, componentName + '/_package/package.json'));
        }

        if(componentInfo.version === componentVersion){
          return callback(null, componentInfo);
        } else {
          return callback('version not available');
        }
      }

      cdn.getFile(getFilePath(componentName, componentVersion, 'package.json'), function(err, component){
        var parsed;

        try {
          parsed = JSON.parse(component);
        } catch(er){
          return callback('parsing error');
        }

        callback(null, parsed);
      });
    },
    getComponentPath: function(componentName, componentVersion){
      var prefix = conf.local ? conf.baseUrl : ('https:' + conf.s3.path + conf.s3.componentsDir + '/');
      return format('{0}{1}/{2}/', prefix, componentName, componentVersion);
    },
    getComponents: function(callback){
      if(conf.local){
        return callback(null, local.getComponents());
      }

      componentsCache.get(function(err, res){
        callback(err, !!res ? _.keys(res.components) : null);
      });
    },
    getComponentVersions: function(componentName, callback){
      if(conf.local){
        return local.getComponentVersions(componentName, callback);
      }

      componentsCache.get(function(err, res){
        callback(err, (!!res && !!_.has(res.components, componentName)) ? res.components[componentName] : []);
      });
    },
    getDataProvider: function(componentName, componentVersion, callback){
      if(conf.local){
        return callback(null, local.getDataProvider(componentName));
      }

      cdn.getFile(getFilePath(componentName, componentVersion, 'server.js'), callback);
    },
    getStaticClientPath: function(){
      return 'https:' + conf.s3.path + getFilePath('oc-client', packageInfo.version, 'src/oc-client.min.js');
    },
    getStaticClientMapPath: function(){
      return 'https:' + conf.s3.path + getFilePath('oc-client', packageInfo.version, 'src/oc-client.min.map');
    },
    getStaticFilePath: function(componentName, componentVersion, filePath){
      return this.getComponentPath(componentName, componentVersion) + (conf.local ? settings.registry.localStaticRedirectorPath : '') + filePath;
    },
    getTemplates: function(){
      return templates;
    },
    init: function(callback){
      if(conf.local){
        return callback(null, 'ok');
      }

      componentsCache.load(callback);
    },
    publishComponent: function(pkgDetails, componentName, componentVersion, callback){
      if(conf.local){
        return callback({
          code: strings.errors.registry.LOCAL_PUBLISH_NOT_ALLOWED_CODE,
          msg: strings.errors.registry.LOCAL_PUBLISH_NOT_ALLOWED
        });
      }

      if(!validator.validateComponentName(componentName)){
        return callback({
          code: strings.errors.registry.COMPONENT_NAME_NOT_VALID_CODE,
          msg: strings.errors.registry.COMPONENT_NAME_NOT_VALID
        });
      }

      if(!validator.validateVersion(componentVersion)){
        return callback({
          code: strings.errors.registry.COMPONENT_VERSION_NOT_VALID_CODE,
          msg: format(strings.errors.registry.COMPONENT_VERSION_NOT_VALID, componentVersion)
        });
      }

      var validationResult = validator.validatePackageJson(_.extend(pkgDetails, {
        componentName: componentName,
        customValidator: conf.publishValidation
      }));

      if(!validationResult.isValid){
        return callback({
          code: strings.errors.registry.COMPONENT_PUBLISHVALIDATION_FAIL_CODE,
          msg: format(strings.errors.registry.COMPONENT_PUBLISHVALIDATION_FAIL, validationResult.error)
        });
      }

      this.getComponentVersions(componentName, function(err, componentVersions){
        
        if(!versionHandler.validateNewVersion(componentVersion, componentVersions)){
          return callback({
            code: strings.errors.registry.COMPONENT_VERSION_ALREADY_FOUND_CODE,
            msg: format(strings.errors.registry.COMPONENT_VERSION_ALREADY_FOUND, componentName, componentVersion, repositorySource)
          });
        }

        cdn.putDir(pkgDetails.outputFolder, conf.s3.componentsDir + '/' + componentName + '/' + componentVersion, function(err, res){
          if(!!err){ return callback(err); }
          componentsCache.refresh(callback);
        });
      });
    },
    saveComponentsInfo: function(componentsInfo, callback){
      cdn.putFileContent(JSON.stringify(componentsInfo), conf.s3.componentsDir + '/components.json', true, callback);
    }
  };
};