'use strict';

const chalk = require('chalk');
const nodeEmoji = require('node-emoji');

const log = (col, style, emoji) =>
  function(msg) {
    console.log(
      chalk[style][col](msg) + (emoji ? ` ${nodeEmoji.get(emoji)}` : '')
    );
  };

module.exports = {
  complete: log('green', 'reset', 'thumbsup'),
  error: log('red', 'reset', 'no_good'),
  fatal: log('red', 'underline', 'no_good'),
  ok: log('gray', 'reset'),
  start: log('green', 'reset')
};
