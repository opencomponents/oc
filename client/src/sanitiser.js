'use strict';

module.exports = {
  sanitiseConfiguration: function(conf){
    conf = conf || {};
    conf.components = conf.components || {};
    conf.cache = conf.cache || {};

    return conf;
  }
};
