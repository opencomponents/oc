import type { Config, OcHandler } from '@oc-framework/core';

export default function plugins(conf: Config): OcHandler {
  return (_req, res): void => {
    if (res.conf.discovery.api) {
      const plugins = Object.entries(conf.plugins).map(
        ([pluginName, plugin]) => ({
          name: pluginName,
          description: plugin.description
        })
      );

      res.status(200).json(plugins);
    } else {
      res.status(401);
    }
  };
}
