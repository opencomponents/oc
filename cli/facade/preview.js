'use strict';

var colors = require('colors/safe');
var opn = require('opn');

var strings = require('../../resources/index');

module.exports = function(dependencies){

  var logger = dependencies.logger,
      registry = dependencies.registry;

  return function(opts){
    registry.getComponentPreviewUrlByUrl(opts.componentHref, function(err, href){
      if(err){ 
        logger.log(colors.red(strings.errors.cli.COMPONENT_HREF_NOT_FOUND));
        return process.exit(1);
      }

      opn(href);
    });
  };
};
