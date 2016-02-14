'use strict';

var colors = require('colors/safe');
var format = require('stringformat');

var strings = require('../../resources/index');

module.exports = function(dependencies){
  
  var local = dependencies.local,
      logger = dependencies.logger;

  return function(opts){
    var componentName = opts.componentName,
        templateType = opts.templateType,
        errors = strings.errors.cli;

    local.init(componentName, templateType, function(err, res){
      if(err){
        if(err === 'name not valid'){
          err = errors.NAME_NOT_VALID;
        }

        if(err === 'template type not valid'){
          err = errors.TEMPLATE_TYPE_NOT_VALID;
        }

        logger.log(colors.red(format(errors.INIT_FAIL, err)));
        process.exit(1);
      } else {
        logger.log(colors.green(format(strings.messages.cli.COMPONENT_INITED, componentName)));
      }
    });
  };
};