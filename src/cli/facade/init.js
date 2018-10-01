'use strict';

const format = require('stringformat');
const path = require('path');
const _ = require('lodash');

const strings = require('../../resources/index');
const wrapCliCallback = require('../wrap-cli-callback');

module.exports = function(dependencies) {
  const local = dependencies.local,
    logger = dependencies.logger;

  return function(opts, callback) {
    const templateType = _.isUndefined(opts.templateType)
      ? 'oc-template-es6'
      : opts.templateType;
    const errors = strings.errors.cli;
    const messages = strings.messages.cli;
    const componentPath = path.join(process.cwd(), opts.componentPath);
    const componentName = path.basename(componentPath);

    callback = wrapCliCallback(callback);
    local.init(
      {
        componentName,
        componentPath,
        templateType,
        logger
      },
      err => {
        if (err) {
          if (err === 'name not valid') {
            err = errors.NAME_NOT_VALID;
          }

          if (err === 'template type not valid') {
            err = format(errors.TEMPLATE_TYPE_NOT_VALID, templateType);
          }
          logger.err(format(errors.INIT_FAIL, err));
        } else {
          logger.log(messages.initSuccess(componentName, componentPath));
        }

        callback(err, componentName);
      }
    );
  };
};
