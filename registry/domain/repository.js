'use strict';

var format = require('stringformat');
var fs = require('fs-extra');
var packageInfo = require('../../package.json');
var path = require('path');
var S3 = require('./s3');
var strings = require('../../resources');
var validator = require('./validator');
var versionHandler = require('./version-handler');
var _ = require('underscore');

module.exports = function(conf){

  var cdn = !conf.local && new S3(conf),
      repositorySource = conf.local ? 'local repository' : 's3 cdn';

  var local = {
    getCompiledView: function(componentName, componentVersion){
      if(componentName === 'oc-client'){
        return fs.readFileSync(path.join(__dirname, '../../components/oc-client/_package/template.js')).toString();
      }

      return fs.readFileSync(path.join(conf.path, componentName + '/_package/template.js')).toString();
    },
    getComponents: function(){ 

      var validComponents = fs.readdirSync(conf.path).filter(function(file){
        var isDir = file.indexOf('.') === -1,
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
        return callback(null, [fs.readJsonSync(path.join(__dirname, '../../package.json')).version]);
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

      cdn.getFile(conf.s3.componentsDir + '/' + componentName + '/' + componentVersion + '/template.js', callback);
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
        var version = versionHandler.getAvailableVersion(componentVersion, availableVersions);

        if(!version){
          return callback(format(strings.errors.registry.COMPONENT_VERSION_NOT_FOUND, componentName, componentVersion, repositorySource));
        }

        self.getComponentInfo(componentName, version, function(err, component){
          if(err){
            return callback('component not available: ' + err, null);
          }
          callback(null, component);
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

      cdn.getFile(conf.s3.componentsDir + '/' + componentName + '/' + componentVersion + '/package.json', function(err, component){
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
      if(conf.local){
        return conf.baseUrl + componentName + '/' + componentVersion + '/';
      }

      return 'https:' + conf.s3.path + conf.s3.componentsDir + '/' + componentName + '/' + componentVersion + '/';
    },
    getComponents: function(callback){
      if(conf.local){
        return callback(null, local.getComponents());
      }
      cdn.listSubDirectories(conf.s3.componentsDir, callback);
    },
    getComponentVersions: function(componentName, callback){
      if(conf.local){
        return local.getComponentVersions(componentName, callback);
      }

      cdn.listSubDirectories(conf.s3.componentsDir + '/' + componentName, callback);
    },
    getDataProvider: function(componentName, componentVersion, callback){
      if(conf.local){
        return callback(null, local.getDataProvider(componentName));
      }

      cdn.getFile(conf.s3.componentsDir + '/' + componentName + '/' + componentVersion + '/server.js', callback);
    },
    getStaticClientPath: function(){
      return 'https:' + conf.s3.path + conf.s3.componentsDir + '/oc-client/' + packageInfo.version + '/src/oc-client.min.js';
    },
    getStaticFilePath: function(componentName, componentVersion, filePath){
      return this.getComponentPath(componentName, componentVersion) + (conf.local ? 'static/' : '') + filePath;
    },
    publishComponent: function(componentDir, componentName, componentVersion, callback){
      if(conf.local){
        return callback({
          code: strings.errors.registry.LOCAL_PUBLISH_NOT_ALLOWED_CODE,
          msg: strings.errors.registry.LOCAL_PUBLISH_NOT_ALLOWED
        });
      }

      if(!validator.validateComponentName(componentName)){
        return callback({
          code: strings.errors.registry.COMPONENT_NAME_NOT_VALID_CODE,
          msg: strings.errors.regitry.COMPONENT_NAME_NOT_VALID
        });
      }

      this.getComponentVersions(componentName, function(err, componentVersions){
        
        if(!versionHandler.validateNewVersion(componentVersion, componentVersions)){
          return callback({
            code: strings.errors.registry.COMPONENT_VERSION_ALREADY_FOUND_CODE,
            msg: format(strings.errors.registry.COMPONENT_VERSION_ALREADY_FOUND, componentName, componentVersion, repositorySource)
          });
        }

        cdn.putDir(componentDir, conf.s3.componentsDir + '/' + componentName + '/' + componentVersion, callback);
      });
    }
  };
};