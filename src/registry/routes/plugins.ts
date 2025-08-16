import type { Request, Response } from 'express';
import type { Config } from '../../types';

export default function plugins(conf: Config) {
  return (_req: Request, res: Response): void => {
    if (res.conf.discovery.ui) {
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
