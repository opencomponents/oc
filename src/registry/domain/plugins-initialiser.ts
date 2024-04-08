import _ from 'lodash';
import { DepGraph } from 'dependency-graph';
import { promisify } from 'util';
import pLimit from '../../utils/pLimit';

import strings from '../../resources';
import { Plugin } from '../../types';

function validatePlugins(plugins: unknown[]): asserts plugins is Plugin[] {
  for (let idx = 0; idx < plugins.length; idx++) {
    const plugin = plugins[idx];
    if (
      !_.isObject((plugin as Plugin).register) ||
      typeof (plugin as Plugin).register.register !== 'function' ||
      typeof (plugin as Plugin).register.execute !== 'function' ||
      typeof (plugin as Plugin).name !== 'string'
    ) {
      throw new Error(
        strings.errors.registry.PLUGIN_NOT_VALID(
          (plugin as Plugin).name || String(idx + 1)
        )
      );
    }
  }
}

function checkDependencies(plugins: Plugin[]) {
  const graph = new DepGraph();

  plugins.forEach((p) => graph.addNode(p.name));

  plugins.forEach((p) => {
    if (!p.register.dependencies) {
      return;
    }

    p.register.dependencies.forEach((d) => {
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

type PluginFunctions = Record<string, (...args: unknown[]) => void>;

export async function init(
  pluginsToRegister: unknown[]
): Promise<PluginFunctions> {
  const registered: PluginFunctions = {};

  validatePlugins(pluginsToRegister);
  checkDependencies(pluginsToRegister);

  const dependenciesRegistered = (dependencies: string[]) => {
    if (dependencies.length === 0) {
      return true;
    }

    let present = true;
    dependencies.forEach((d) => {
      if (!registered[d]) {
        present = false;
      }
    });

    return present;
  };

  const loadPlugin = async (plugin: Plugin): Promise<void> => {
    if (registered[plugin.name]) {
      return;
    }

    if (!plugin.register.dependencies) {
      plugin.register.dependencies = [];
    }

    if (!dependenciesRegistered(plugin.register.dependencies)) {
      deferredLoads.push(plugin);
      return;
    }

    const dependencies = _.pick(registered, plugin.register.dependencies);

    const register = promisify(plugin.register.register);

    const pluginCallback = plugin.callback || _.noop;
    await register(plugin.options || {}, dependencies).catch((err) => {
      pluginCallback(err);
      throw err;
    });
    // Overriding toString so implementation details of plugins do not
    // leak to OC consumers
    plugin.register.execute.toString = () => plugin.description || '';
    registered[plugin.name] = plugin.register.execute;
    pluginCallback();
  };

  const terminator = async (): Promise<PluginFunctions> => {
    if (deferredLoads.length > 0) {
      const deferredPlugins = _.clone(deferredLoads);
      deferredLoads = [];

      await Promise.all(
        deferredPlugins.map((plugin) => onSeries(() => loadPlugin(plugin)))
      );
      return terminator();
    }

    return registered;
  };

  const onSeries = pLimit(1);

  await Promise.all(
    pluginsToRegister.map((plugin) => onSeries(() => loadPlugin(plugin)))
  );

  return terminator();
}
