import strings from '../../resources/index';
import { Local } from '../../types';
import { Logger } from '../logger';

const mock =
  ({ local, logger }: { local: Local; logger: Logger }) =>
  (
    opts: { targetType: string; targetValue: string; targetName: string },
    callback: (err: unknown) => void
  ): void => {
    local.mock(opts, err => {
      logger.ok(
        strings.messages.cli.MOCKED_PLUGIN(opts.targetName, opts.targetValue)
      );
      callback(err);
    });
  };

export default mock;
