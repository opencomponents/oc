import { promisify } from 'node:util';
import { DepGraph } from 'dependency-graph';
import strings from '../../resources';
import type { Plugin } from '../../types';
import pLimit from '../../utils/pLimit';

function validatePlugins(plugins: unknown[]): asserts plugins is Plugin[] {
  for (let idx = 0; idx < plugins.length; idx++) {
    const plugin = plugins[idx] as Plugin;
    if (
      (!plugin.register && typeof plugin.register !== 'object') ||
      typeof plugin.register.register !== 'function' ||
      typeof plugin.register.execute !== 'function' ||
      typeof plugin.name !== 'string'
    ) {
      throw new Error(
        strings.errors.registry.PLUGIN_NOT_VALID(plugin.name || String(idx + 1))
      );
    }
  }
}

function checkDependencies(plugins: Plugin[]) {
  const graph = new DepGraph();

  for (const plugin of plugins) {
    graph.addNode(plugin.name);
  }

  for (const p of plugins) {
    if (!p.register.dependencies) {
      return;
    }

    for (const d of p.register.dependencies) {
      try {
        graph.addDependency(p.name, d);
      } catch {
        throw new Error(`unknown plugin dependency: ${d}`);
      }
    }
  }

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
    for (const d of dependencies) {
      if (!registered[d]) {
        present = false;
      }
    }

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

    const dependencies = Object.fromEntries(
      Object.entries(registered).filter(([key]) =>
        plugin.register.dependencies?.includes(key)
      )
    );

    const register = promisify(plugin.register.register);

    const pluginCallback = plugin.callback || (() => {});
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
      const deferredPlugins = [...deferredLoads];
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
