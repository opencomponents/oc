'use strict';

var format = require('stringformat');

var packageInfo = require('../package');
var _ = require('./utils/helpers');

var lowerHeaderKeys = function(headers){
  var result = {};

  _.each(headers, function(header, headerName){
    result[headerName.toLowerCase()] = header;
  });

  return result;
};

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

    var defaultUserAgent = format('oc-client-{0}/{1}-{2}-{3}',
                                  packageInfo.version,
                                  process.version,
                                  process.platform,
                                  process.arch);

    options = options || {};
    
    options.headers = lowerHeaderKeys(options.headers);
    options.headers.accept = 'application/vnd.oc.unrendered+json';
    options.headers['user-agent'] = options.headers['user-agent'] || defaultUserAgent;

    options.timeout = options.timeout || 5;
    options.container = (options.container === true) ?  true : false;
    options.renderInfo = (options.renderInfo === false) ? false : true;

    if(!!config.registries && !config.registries.clientRendering){
      options.disableFailoverRendering = true;
    }

    return options;
  }
};
