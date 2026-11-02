const { colors } = require('@oc-framework/core');

const log = (col) => (msg) => {
  console.log(colors[col](msg));
};

module.exports = {
  complete: log('green'),
  error: log('red'),
  fatal: log('red'),
  ok: log('gray'),
  start: log('green')
};
