'use strict';

var strings = require('../../resources/index');
var wrapCliCallback = require('../wrap-cli-callback');

module.exports = function(dependencies){
  
  var registry = dependencies.registry,
    logger = dependencies.logger;

  return function(opts, callback){

    callback = wrapCliCallback(callback);
    
    registry.add(opts.registryUrl, function(err){
      if(err){
        logger.err(err);
        return callback(err);
      }

      logger.ok(strings.messages.cli.REGISTRY_ADDED);
      callback(null, 'ok');
    });
  };
};