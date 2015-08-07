'use strict';

var async = require('async');
var format = require('stringformat');
var _ = require('underscore');

var strings = require('../../resources');

module.exports.init = function(pluginsToRegister, callback){

  var c = 0,
      registered = {};

  async.mapSeries(pluginsToRegister, function(plugin, cb){

    c++;
    if(!_.isObject(plugin.register) || !_.isFunction(plugin.register.register) || 
       !_.isFunction(plugin.register.execute) || !_.isString(plugin.name)){
      return cb(format(strings.errors.registry.PLUGIN_NOT_VALID, c));
    }

    plugin.register.register(plugin.options || {}, plugin.callback || _.noop);
    registered[plugin.name] = plugin.register.execute;    
    cb();
  }, function(err){
    callback(err, registered);
  });
};