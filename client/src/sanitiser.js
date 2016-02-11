'use strict';

var _ = require('./utils/helpers');

module.exports = {
  sanitiseConfiguration: function(conf){
    conf = conf || {};
    conf.components = conf.components || {};
    conf.cache = conf.cache || {};

    return conf;
  },
  sanitiseGlobalRenderOptions: function(options, config){

    if(_.isFunction(options)){
      options = {};
    }

    options = options || {};
    options.headers = options.headers || {};
    options.headers.accept = 'application/vnd.oc.unrendered+json';
    options.timeout = options.timeout || 5;
    options.container = (options.container === true) ?  true : false;
    options.renderInfo = (options.renderInfo === false) ? false : true;

    if(!!config.registries && !config.registries.clientRendering){
      options.disableFailoverRendering = true;
    }

    return options;
  }
};
