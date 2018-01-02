module.exports = function errorToString(err) {
  const isString = typeof error === 'string';
  const hasMessage = err != null && typeof err.msg === 'string';
  if (isString) {
    return err;
  } else if (hasMessage) {
    return err.msg;
  }

  return err + '';
};
