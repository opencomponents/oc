'use strict';

const read = require('read');

const strings = require('../../resources/index').default;

module.exports = function(dependencies) {
  const { local, logger } = dependencies;
  const { fetchList, remove } = local.clean;
  const {
    cleanAlreadyClean,
    cleanList,
    cleanPrompt,
    cleanPromptDefault,
    cleanSuccess
  } = strings.messages.cli;

  const prompt = cb =>
    read(
      { prompt: cleanPrompt, default: cleanPromptDefault },
      (err, result) => {
        if (err) return cb(false);
        const lowered = result.toLowerCase().trim();
        const proceed = lowered === 'y' || lowered === 'yes';
        cb(proceed);
      }
    );

  const removeFolders = (list, cb) =>
    remove(list, err => {
      if (err) {
        logger.err(strings.errors.cli.cleanRemoveError(err));
        return cb(err);
      }

      logger.ok(cleanSuccess);
      cb();
    });

  return function(opts, callback) {
    fetchList(opts.dirPath, (err, list) => {
      if (err) {
        logger.err(strings.errors.generic(err));
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
