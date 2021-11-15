import strings from '../../resources/index';
import { RegistryCli } from '../../types';
import { Logger } from '../logger';

const registryAdd =
  ({ registry, logger }: { logger: Logger; registry: RegistryCli }) =>
  (
    opts: { registryUrl: string },
    callback: (err: string | null, data: string) => void
  ): void => {
    registry.add(opts.registryUrl, err => {
      if (err) {
        logger.err(err);
        return callback(err, undefined as any);
      }

      logger.ok(strings.messages.cli.REGISTRY_ADDED);
      callback(null, 'ok');
    });
  };

export default registryAdd;
