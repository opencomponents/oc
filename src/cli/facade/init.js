'use strict';

var colors = require('colors/safe');
var format = require('stringformat');
var _ = require('underscore');

var strings = require('../../resources/index');
var wrapCliCallback = require('../wrap-cli-callback');

module.exports = function(dependencies){
  
  var local = dependencies.local,
      logger = dependencies.logger;

  return function(opts, callback){

    var componentName = opts.componentName,
        templateType = _.isUndefined(opts.templateType) ? 'handlebars' : opts.templateType,
        errors = strings.errors.cli;

    callback = wrapCliCallback(callback);

    local.init(componentName, templateType, function(err, res){
      if(err){
        if(err === 'name not valid'){
          err = errors.NAME_NOT_VALID;
        }

        if(err === 'template type not valid'){
          err = errors.TEMPLATE_TYPE_NOT_VALID;
        }

        logger.log(colors.red(format(errors.INIT_FAIL, err)));
      } else {
        logger.log(colors.green(format(strings.messages.cli.COMPONENT_INITED, componentName)));
      }

      callback(err, componentName);
    });
  };
};