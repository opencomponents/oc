import async from 'async';
import _ from 'lodash';
import { DepGraph } from 'dependency-graph';

import strings from '../../resources';
import { Plugin } from '../../types';

function validatePlugins(plugins: unknown[]): asserts plugins is Plugin[] {
  let c = 0;

  plugins.forEach(plugin => {
    c++;
    if (
      !_.isObject((plugin as Plugin).register) ||
      !_.isFunction((plugin as Plugin).register.register) ||
      !_.isFunction((plugin as Plugin).register.execute) ||
      !_.isString((plugin as Plugin).name)
    ) {
      throw new Error(
        strings.errors.registry.PLUGIN_NOT_VALID(
          (plugin as Plugin).name || String(c)
        )
      );
    }
  });
}

function checkDependencies(plugins: Plugin[]) {
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
}

let deferredLoads: Plugin[] = [];
const defer = function(plugin: Plugin, cb: (err?: Error) => void) {
  deferredLoads.push(plugin);
  return cb();
};

export function init(
  pluginsToRegister: unknown[],
  callback: Callback<Dictionary<(...args: unknown[]) => void>, unknown>
): void {
  const registered: Dictionary<(...args: unknown[]) => void> = {};

  try {
    validatePlugins(pluginsToRegister);
    checkDependencies(pluginsToRegister);
  } catch (err) {
    return callback(err, undefined as any);
  }

  const dependenciesRegistered = (dependencies: string[]) => {
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

  const loadPlugin = (plugin: Plugin, cb: (err?: Error) => void) => {
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

    plugin.register.register(
      plugin.options || {},
      dependencies,
      (err?: Error) => {
        const pluginCallback = plugin.callback || _.noop;
        pluginCallback(err);
        // Overriding toString so implementation details of plugins do not
        // leak to OC consumers
        plugin.register.execute.toString = () => plugin.description || '';
        registered[plugin.name] = plugin.register.execute;
        done(err);
      }
    );
  };

  const terminator = function(err: Error) {
    if (deferredLoads.length > 0) {
      const deferredPlugins = _.clone(deferredLoads);
      deferredLoads = [];

      return async.mapSeries(deferredPlugins, loadPlugin, terminator as any);
    }

    callback(err, registered);
  };

  async.mapSeries(pluginsToRegister, loadPlugin, terminator as any);
}
