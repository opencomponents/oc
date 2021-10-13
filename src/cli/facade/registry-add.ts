import { fromPromise } from 'universalify';
import strings from '../../resources/index';
import { RegistryCli } from '../../types';
import { Logger } from '../logger';

const registryAdd = ({
  registry,
  logger
}: {
  logger: Logger;
  registry: RegistryCli;
}) =>
  fromPromise(async (opts: { registryUrl: string }): Promise<void> => {
    try {
      await registry.add(opts.registryUrl);
      logger.ok(strings.messages.cli.REGISTRY_ADDED);
    } catch (err) {
      logger.err(String(err));
      throw err;
    }
  });

export default registryAdd;

module.exports = registryAdd;
