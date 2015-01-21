'use strict';

var colors = require('colors');
var format = require('../../utils/format');
var strings = require('../../resources/index');

module.exports = function(dependencies){
  
  var local = dependencies.local,
      logger = dependencies.logger;

  return function(opts){
    var componentName = opts.componentName,
        errors = strings.errors.cli;

    if(componentName.trim() === ''){
      return logger.log(format(errors.INIT_FAIL, errors.NAME_NOT_VALID).red);
    }

    local.init(componentName, function(err, res){
      if(err){
        logger.log(format(errors.INIT_FAIL.red, err));
      } else {
        logger.log(format(strings.messages.cli.COMPONENT_INITED.green, componentName));
      }
    });
  };
};