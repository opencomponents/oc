'use strict';

const colors = require('colors/safe');
const opn = require('opn');

const strings = require('../../resources/index');
const wrapCliCallback = require('../wrap-cli-callback');

module.exports = function(dependencies){

  let logger = dependencies.logger,
      registry = dependencies.registry;

  return function(opts, callback){

    callback = wrapCliCallback(callback);

    registry.getComponentPreviewUrlByUrl(opts.componentHref, function(err, href){
      if(err){ 
        logger.log(colors.red(strings.errors.cli.COMPONENT_HREF_NOT_FOUND));
        return callback(strings.errors.cli.COMPONENT_HREF_NOT_FOUND);
      }
      opn(href);
      callback(null, href);
    });
  };
};
