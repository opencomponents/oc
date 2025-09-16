const chalk = require('chalk');
const nodeEmoji = require('node-emoji');

const log = (col, style, emoji) => (msg) => {
  console.log(
    chalk[style][col](msg) + (emoji ? ` ${nodeEmoji.get(emoji)}` : '')
  );
};

module.exports = {
  complete: log('green', 'reset', '+1'),
  error: log('red', 'reset', 'no_good_man'),
  fatal: log('red', 'underline', 'no_good_man'),
  ok: log('gray', 'reset'),
  start: log('green', 'reset')
};
