import type { Config } from '../../types';
import type { OcHandler } from '../domain/http-server/types';
import getAvailableDependencies from './helpers/get-available-dependencies';

export default function dependencies(conf: Config): OcHandler {
  return (_req, res): void => {
    if (res.conf.discovery.api) {
      const dependencies = getAvailableDependencies(conf.dependencies).map(
        ({ core, name, version }) => {
          const dep: { name: string; core: boolean; versions?: string[] } = {
            name,
            core
          };
          if (!core && version) {
            // In the future this could be multiple versions
            dep.versions = [version];
          }
          return dep;
        }
      );

      res.status(200).json(dependencies);
    } else {
      res.status(401);
    }
  };
}
