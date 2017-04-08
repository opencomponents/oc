'use strict';

var opn = require('opn');

var strings = require('../../resources/index');
var wrapCliCallback = require('../wrap-cli-callback');

module.exports = function(dependencies){

  var logger = dependencies.logger,
      registry = dependencies.registry;

  return function(opts, callback){

    callback = wrapCliCallback(callback);

    registry.getComponentPreviewUrlByUrl(opts.componentHref, function(err, href){
      if(err){ 
        logger.err(strings.errors.cli.COMPONENT_HREF_NOT_FOUND);
        return callback(strings.errors.cli.COMPONENT_HREF_NOT_FOUND);
      }
      opn(href);
      callback(null, href);
    });
  };
};
