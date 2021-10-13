import read from 'read';
import { fromPromise } from 'universalify';
import strings from '../../resources/index';
import { Local } from '../../types';
import { Logger } from '../logger';

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

  const prompt = (cb: (proceed: boolean) => void) =>
    read(
      { prompt: cleanPrompt, default: cleanPromptDefault },
      (err, result) => {
        if (err) return cb(false);
        const lowered = result.toLowerCase().trim();
        const proceed = lowered === 'y' || lowered === 'yes';
        cb(proceed);
      }
    );

  const removeFolders = (list: string[], cb: (err?: unknown) => void) =>
    fromPromise(remove)(list, err => {
      if (err) {
        logger.err(strings.errors.cli.cleanRemoveError(String(err)));
        return cb(err);
      }

      logger.ok(cleanSuccess);
      cb();
    });

  return (
    opts: { dirPath: string; yes: boolean },
    callback: (err?: unknown) => void
  ) => {
    fromPromise(fetchList)(opts.dirPath, (err, list) => {
      if (err) {
        logger.err(strings.errors.generic(String(err)));
        return callback(err);
      }

      if (list.length === 0) {
        logger.ok(cleanAlreadyClean);
        return callback();
      }

      logger.warn(cleanList(list));
      const shouldConfirm = !opts.yes;

      if (shouldConfirm) {
        return prompt(confirmed => {
          if (!confirmed) return callback();
          return removeFolders(list, callback);
        });
      }

      removeFolders(list, callback);
    });
  };
};

export default clean;

module.exports = clean;
