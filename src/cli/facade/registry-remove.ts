import strings from '../../resources/index';
import { RegistryCli } from '../../types';
import { Logger } from '../logger';

const registryRemove = ({
  registry,
  logger
}: {
  logger: Logger;
  registry: RegistryCli;
}) => (opts: { registryUrl: string }, callback: Callback<string>): void => {
  registry.remove(opts.registryUrl, err => {
    if (err) {
      logger.err(String(err));
      return callback(err, undefined as any);
    }

    logger.ok(strings.messages.cli.REGISTRY_REMOVED);
    callback(null, 'ok');
  });
};

export default registryRemove;

module.exports = registryRemove;
