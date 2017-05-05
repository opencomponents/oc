'use strict';

const format = require('stringformat');

const packageInfo = require('../package');
const _ = require('./utils/helpers');

const lowerHeaderKeys = function(headers){
  const result = {};

  _.each(headers, (header, headerName) => {
    result[headerName.toLowerCase()] = header;
  });

  return result;
};

const getDefaultUserAgent = function() {
  return format('oc-client-{0}/{1}-{2}-{3}',
                packageInfo.version,
                process.version,
                process.platform,
                process.arch);
};

const sanitiseDefaultOptions = function(options) {
  if(_.isFunction(options)){
    options = {};
  }

  options = options || {};
  options.headers = lowerHeaderKeys(options.headers);
  options.headers['user-agent'] = options.headers['user-agent'] || getDefaultUserAgent();

  options.timeout = options.timeout || 5;
  return options;
};

module.exports = {
  sanitiseConfiguration: function(conf){
    conf = conf || {};
    conf.components = conf.components || {};
    conf.cache = conf.cache || {};

    return conf;
  },

  sanitiseGlobalRenderOptions: function(options, config){
    options = sanitiseDefaultOptions(options);
    options.headers.accept = 'application/vnd.oc.unrendered+json';

    options.container = (options.container === true) ?  true : false;
    options.renderInfo = (options.renderInfo === false) ? false : true;

    if(!!config.registries && !config.registries.clientRendering){
      options.disableFailoverRendering = true;
    }

    return options;
  },

  sanitiseGlobalGetInfoOptions: function(options) {
    options = sanitiseDefaultOptions(options);
    options.headers.accept = 'application/vnd.oc.info+json';
    return options;
  }
};
