const colors = require('picocolors');

const log = (col, style, emoji) => (msg) => {
  console.log(colors[style](colors[col](msg)) + (emoji ? ` ${emoji}` : ''));
};

module.exports = {
  complete: log('green', 'reset', '👍'),
  error: log('red', 'reset', '🙅‍♂️'),
  fatal: log('red', 'underline', '🙅‍♂️'),
  ok: log('gray', 'reset'),
  start: log('green', 'reset')
};
