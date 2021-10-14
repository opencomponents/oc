import _ from 'lodash';

import strings from '../../resources/index';
import { RegistryCli } from '../../types';
import { Logger } from '../logger';

const registryLs =
  ({ registry, logger }: { logger: Logger; registry: RegistryCli }) =>
  (opts: unknown, callback: Callback<string[], string>): void => {
    registry.get((err, registries) => {
      if (err) {
        logger.err(strings.errors.generic(err));
        return callback(err, undefined as any);
      } else {
        logger.warn(strings.messages.cli.REGISTRY_LIST);

        if (registries.length === 0) {
          err = strings.errors.cli.REGISTRY_NOT_FOUND;
          logger.err(err);
          return callback(err, undefined as any);
        }

        _.forEach(registries, registryLocation => logger.ok(registryLocation));

        callback(null, registries);
      }
    });
  };

export default registryLs;
