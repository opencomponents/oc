import { fromPromise } from 'universalify';
import strings from '../../resources/index';
import { Local } from '../../types';
import { Logger } from '../logger';

const mock = ({ local, logger }: { local: Local; logger: Logger }) =>
  fromPromise(
    async (opts: {
      targetType: string;
      targetValue: string;
      targetName: string;
    }): Promise<void> => {
      await local.mock(opts);
      logger.ok(
        strings.messages.cli.MOCKED_PLUGIN(opts.targetName, opts.targetValue)
      );
    }
  );

export default mock;
