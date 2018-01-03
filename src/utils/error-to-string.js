const _ = require('lodash');

module.exports = function errorToString(err) {
  const hasMessage = err != null && _.isString(err.msg);
  if (_.isString(err)) {
    return err;
  } else if (hasMessage) {
    return err.msg;
  }

  return err + '';
};
