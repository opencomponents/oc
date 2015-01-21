'use strict';

var colors = require('colors');
var strings = require('../../resources/index');

module.exports = function(dependencies){
  
  var local = dependencies.local,
      logger = dependencies.logger;

  return function(opts){
    local.unlink(opts.componentName, function(err, res){
      if(err){
        return logger.log(err.red);
      } else {
        return logger.log(strings.messages.cli.COMPONENT_UNLINKED.green);
      }
    });
  };
};