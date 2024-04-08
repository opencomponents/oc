import readCb from 'read';
import { fromPromise } from 'universalify';
import { promisify } from 'node:util';
import strings from '../../resources/index';
import type { Local } from '../domain/local';
import type { Logger } from '../logger';

const read = promisify(readCb);

const clean = ({
  local: {
    clean: { fetchList, remove }
  },
  logger
}: {
  local: Local;
  logger: Logger;
}) => {
  const {
    cleanAlreadyClean,
    cleanList,
    cleanPrompt,
    cleanPromptDefault,
    cleanSuccess
  } = strings.messages.cli;

  const prompt = async (): Promise<boolean> => {
    try {
      const result = await read({
        prompt: cleanPrompt,
        default: cleanPromptDefault
      });
      const lowered = result.toLowerCase().trim();
      return lowered === 'y' || lowered === 'yes';
    } catch (err) {
      return false;
    }
  };

  const removeFolders = async (list: string[]) => {
    try {
      await remove(list);
      logger.ok(cleanSuccess);
    } catch (err) {
      logger.err(strings.errors.cli.cleanRemoveError(String(err)));
      throw err;
    }
  };

  return fromPromise(async (opts: { dirPath: string; yes: boolean }) => {
    try {
      const list = await fetchList(opts.dirPath);

      if (list.length === 0) {
        logger.ok(cleanAlreadyClean);
        return;
      }

      logger.warn(cleanList(list));
      const shouldConfirm = !opts.yes;

      if (shouldConfirm) {
        const confirmed = await prompt();
        if (!confirmed) return;
      }

      await removeFolders(list);
    } catch (err) {
      logger.err(strings.errors.generic(String(err)));
      throw err;
    }
  });
};

export default clean;
