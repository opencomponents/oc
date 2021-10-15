import { fromPromise } from 'universalify';
import strings from '../../resources/index';
import { RegistryCli } from '../../types';
import { Logger } from '../logger';

const registryRemove = ({
  registry,
  logger
}: {
  logger: Logger;
  registry: RegistryCli;
}) =>
  fromPromise(async (opts: { registryUrl: string }): Promise<void> => {
    try {
      await registry.remove(opts.registryUrl);
      logger.ok(strings.messages.cli.REGISTRY_REMOVED);
    } catch (err) {
      logger.err(String(err));
      throw err;
    }
  });

export default registryRemove;
