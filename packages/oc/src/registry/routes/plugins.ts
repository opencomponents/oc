import type { Config } from '../../types';
import type { OcHandler } from '../domain/http-server/types';

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
