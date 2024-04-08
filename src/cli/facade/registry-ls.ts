import { fromPromise } from 'universalify';

import strings from '../../resources/index';
import type { RegistryCli } from '../domain/registry';
import type { Logger } from '../logger';

const registryLs = ({
  registry,
  logger
}: {
  logger: Logger;
  registry: RegistryCli;
}) =>
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fromPromise(async (_opts: unknown): Promise<string[]> => {
    try {
      const registries = await registry.get();

      logger.warn(strings.messages.cli.REGISTRY_LIST);

      if (registries.length === 0) {
        const err = strings.errors.cli.REGISTRY_NOT_FOUND;
        logger.err(err);
        throw err;
      }

      for (const registryLocation of registries) {
        logger.ok(registryLocation);
      }

      return registries;
    } catch (err) {
      logger.err(strings.errors.generic(String(err)));
      throw err;
    }
  });

export default registryLs;
