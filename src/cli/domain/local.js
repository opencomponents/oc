'use strict';

var fs = require('fs-extra');
var path = require('path');
var targz = require('targz');
var _ = require('underscore');

var getComponentsByDir = require('./get-components-by-dir');
var getLocalNpmModules = require('./get-local-npm-modules');
var packageComponents = require('./package-components');
var mock = require('./mock');
var validator = require('../../registry/domain/validators');

module.exports = function(dependencies){

  return _.extend(this, {
    cleanup: function(compressedPackagePath, callback){
      return fs.unlink(compressedPackagePath, callback);
    },
    compress: function(input, output, callback){
      return targz.compress({
        src: input,
        dest: output,
        tar: {
          map: function(file){
            return _.extend(file, {
              name: '_package/' + file.name
            });
          }
        }
      }, callback);
    },
    getComponentsByDir: getComponentsByDir(dependencies),
    getLocalNpmModules: getLocalNpmModules(),
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
    mock: mock(),
    package: packageComponents()
  });
};
