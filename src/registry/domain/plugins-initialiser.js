'use strict';

const async = require('async');
const format = require('stringformat');
const _ = require('lodash');
const DepGraph = require('dependency-graph').DepGraph;

const strings = require('../../resources');

const validatePlugins = function(plugins) {
  let c = 0;

  plugins.forEach(plugin => {
    c++;
    if (
      !_.isObject(plugin.register) ||
      !_.isFunction(plugin.register.register) ||
      !_.isFunction(plugin.register.execute) ||
      !_.isString(plugin.name)
    ) {
      throw new Error(
        format(strings.errors.registry.PLUGIN_NOT_VALID, plugin.name || c)
      );
    }
  });
};

const checkDependencies = function(plugins) {
  const graph = new DepGraph();

  plugins.forEach(p => graph.addNode(p.name));

  plugins.forEach(p => {
    if (!p.register.dependencies) {
      return;
    }

    p.register.dependencies.forEach(d => {
      try {
        graph.addDependency(p.name, d);
      } catch (err) {
        throw new Error(`unknown plugin dependency: ${d}`);
      }
    });
  });

  return graph.overallOrder();
};

let deferredLoads = [];
const defer = function(plugin, cb) {
  deferredLoads.push(plugin);
  return cb();
};

module.exports.init = function(pluginsToRegister, callback) {
  const registered = {};

  try {
    validatePlugins(pluginsToRegister);
    checkDependencies(pluginsToRegister);
  } catch (err) {
    return callback(err);
  }

  const dependenciesRegistered = function(dependencies) {
    if (dependencies.length === 0) {
      return true;
    }

    let present = true;
    dependencies.forEach(d => {
      if (!registered[d]) {
        present = false;
      }
    });

    return present;
  };

  const loadPlugin = function(plugin, cb) {
    const done = _.once(cb);

    if (registered[plugin.name]) {
      return done();
    }

    if (!plugin.register.dependencies) {
      plugin.register.dependencies = [];
    }

    if (!dependenciesRegistered(plugin.register.dependencies)) {
      return defer(plugin, done);
    }

    const dependencies = _.pick(registered, plugin.register.dependencies);

    plugin.register.register(plugin.options || {}, dependencies, err => {
      const pluginCallback = plugin.callback || _.noop;
      pluginCallback(err);
      registered[plugin.name] = plugin.register.execute;
      done(err);
    });
  };

  const terminator = function(err) {
    if (deferredLoads.length > 0) {
      const deferredPlugins = _.clone(deferredLoads);
      deferredLoads = [];

      return async.mapSeries(deferredPlugins, loadPlugin, terminator);
    }

    callback(err, registered);
  };

  async.mapSeries(pluginsToRegister, loadPlugin, terminator);
};
