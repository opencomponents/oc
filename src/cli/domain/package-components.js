'use strict';

const fs = require('fs-extra');
const path = require('path');
const async = require('async');
const _ = require('lodash');

const packageServerScript = require('./package-server-script');
const packageStaticFiles = require('./package-static-files');
const packageTemplate = require('./package-template');
const getUnixUtcTimestamp = require('../../utils/get-unix-utc-timestamp');
const validator = require('../../registry/domain/validators');

module.exports = function(){
  return function(options, callback){

    const componentPath = options.componentPath;
    const minify = options.minify === true;

    const files = fs.readdirSync(componentPath),
      publishPath = path.join(componentPath, '_package');

    if(_.includes(files, '_package')){
      fs.removeSync(publishPath);
    }

    fs.mkdirSync(publishPath);

    const componentPackagePath = path.join(componentPath, 'package.json'),
      ocPackagePath = path.join(__dirname, '../../../package.json');

    if(!fs.existsSync(componentPackagePath)){
      return callback(new Error('component does not contain package.json'));
    } else if(!fs.existsSync(ocPackagePath)){
      return callback(new Error('error resolving oc internal dependencies'));
    }

    const component = fs.readJsonSync(componentPackagePath),
      ocInfo = fs.readJsonSync(ocPackagePath);

    if(!validator.validateComponentName(component.name)){
      return callback(new Error('name not valid'));
    }

    async.waterfall([
      function(cb){
        // Packaging template.js

        packageTemplate({
          componentName: component.name,
          componentPath: componentPath,
          ocOptions: component.oc,
          publishPath: publishPath
        }, (err, packagedTemplateInfo) => {
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
          publishPath: publishPath,
          verbose: options.verbose
        }, (err, packagedServerScriptInfo) => {
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

        fs.writeJson(path.join(publishPath, 'package.json'), component, (err) => {
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
        }, (err) => cb(err, component));
      }
    ], callback);
  };
};
