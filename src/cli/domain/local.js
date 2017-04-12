'use strict';

const fs = require('fs-extra');
const path = require('path');
const targz = require('targz');
const _ = require('lodash');

const getComponentsByDir = require('./get-components-by-dir');
const getLocalNpmModules = require('./get-local-npm-modules');
const packageComponents = require('./package-components');
const mock = require('./mock');
const validator = require('../../registry/domain/validators');
const initTemplate = require('./init-template');

module.exports = function() {
  return _.extend(this, {
    cleanup: function(compressedPackagePath, callback) {
      return fs.unlink(compressedPackagePath, callback);
    },
    compress: function(input, output, callback) {
      return targz.compress(
        {
          src: input,
          dest: output,
          tar: {
            map: function(file) {
              return _.extend(file, {
                name: '_package/' + file.name
              });
            }
          }
        },
        callback
      );
    },
    getComponentsByDir: getComponentsByDir(),
    getLocalNpmModules: getLocalNpmModules(),
    init: function(componentName, templateType, options, callback){

      if(!validator.validateComponentName(componentName)){
        return callback('name not valid');
      }

      // LEGACY TEMPLATES
      if(validator.validateTemplateType(templateType)){
        try {
          const pathDir = '../../components/base-component-' + templateType,
            baseComponentDir = path.resolve(__dirname, pathDir),
            npmIgnorePath = path.resolve(__dirname, pathDir + '/.npmignore');

          fs.ensureDirSync(componentName);
          fs.copySync(baseComponentDir, componentName);
          fs.copySync(npmIgnorePath, componentName + '/.gitignore');

          const componentPath = path.resolve(componentName, 'package.json'),
            component = _.extend(fs.readJsonSync(componentPath), {
              name: componentName
            });

          fs.outputJsonSync(componentPath, component);

          return callback(null, { ok: true });
        } catch(e){
          return callback(e);
        }
      }
      try {
        initTemplate(componentName, templateType, options, callback);
      } catch (e) {
        return callback('template type not valid');
      }
    },
    mock: mock(),
    package: packageComponents()
  });
};
