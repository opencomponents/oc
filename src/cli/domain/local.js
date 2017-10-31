'use strict';

const fs = require('fs-extra');
const path = require('path');
const targz = require('targz');
const _ = require('lodash');

const getComponentsByDir = require('./get-components-by-dir');
const packageComponents = require('./package-components');
const mock = require('./mock');
const validator = require('../../registry/domain/validators');
const initTemplate = require('./init-template');
const strings = require('../../resources');

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
    init: function(options, callback) {
      let { componentName, templateType, logger } = options;
      if (!validator.validateComponentName(componentName)) {
        return callback('name not valid');
      }

      // LEGACY TEMPLATES WARNING
      if (validator.validateTemplateType(templateType)) {
        const legacyName = templateType;
        templateType = legacyName.replace(
          legacyName,
          `oc-template-${legacyName}`
        );
        logger.warn(
          strings.messages.cli.legacyTemplateDeprecationWarning(
            legacyName,
            templateType
          )
        );
      }
      try {
        initTemplate(
          _.extend(options, {
            templateType,
            compiler: `${templateType}-compiler`
          }),
          callback
        );
      } catch (e) {
        return callback('template type not valid');
      }
    },
    mock: mock(),
    package: packageComponents()
  });
};
