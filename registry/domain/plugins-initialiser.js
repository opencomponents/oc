'use strict';

var async = require('async');
var format = require('stringformat');
var _ = require('underscore');
var madge = require('madge');

var strings = require('../../resources');

var validatePlugins = function(plugins){
  var c = 0;

  plugins.forEach(function(plugin){
    c++;
    if(!_.isObject(plugin.register) || !_.isFunction(plugin.register.register) ||
       !_.isFunction(plugin.register.execute) || !_.isString(plugin.name)){
      throw new Error(format(strings.errors.registry.PLUGIN_NOT_VALID, plugin.name || c));
    }
  });
};

var checkDependencies = function(plugins){
    var dependencies = {};

    plugins.forEach(function(p){
      if(!p.register.dependencies){
        dependencies[p.name] = [];
        return;
      }

      dependencies[p.name] = p.register.dependencies;
    });

    var missing = _.difference(_.flatten(_.values(dependencies)), _.pluck(plugins, 'name'));

    if(missing.length > 0){
      throw new Error('unknown plugin dependency(s) :' + JSON.stringify(missing));
    }

    var tree = madge(dependencies, { findNestedDependencies: true });
    var circular = tree.circular().getArray();
    if(circular.length){
        throw new Error('circular dependency detected in plugins: ' + circular);
    }

    return tree;
};

var deferredLoads = [];
var defer = function(plugin, cb){
  deferredLoads.push(plugin);
  return cb();
};

module.exports.init = function(pluginsToRegister, callback){

  var registered = {};

  try {
      validatePlugins(pluginsToRegister);
      checkDependencies(pluginsToRegister);
  }
  catch(err){
      return callback(err);
  }

  var dependenciesRegistered = function(dependencies){
    if(dependencies.length === 0){
      return true;
    }

    var present = true;
    dependencies.forEach(function(d) {
      if(!registered[d]){
        present = false;
      }
    });

    return present;
  };

  var loadPlugin = function(plugin, cb){
    if(registered[plugin.name]){
      return cb();
    }

    if(!plugin.register.dependencies){
        plugin.register.dependencies = [];
    }

    if(!dependenciesRegistered(plugin.register.dependencies)){
      return defer(plugin, cb);
    }

    var dependencies = _.pick(registered, plugin.register.dependencies);

    plugin.register.register(plugin.options || {}, dependencies, plugin.callback || _.noop);
    registered[plugin.name] = plugin.register.execute;
    cb();
  };

  var terminator = function(err){
    if(deferredLoads.length > 0){
      var deferredPlugins = _.clone(deferredLoads);
      deferredLoads = [];

      return async.mapSeries(deferredPlugins, loadPlugin, terminator);
    }

    callback(err, registered);
  };

  async.mapSeries(pluginsToRegister, loadPlugin, terminator);
};
