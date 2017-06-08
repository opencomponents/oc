'use strict';

const colors = require('colors/safe');

const logger = {
  writeLn: console.log,
  write: msg => process.stdout.write(msg.toString())
};

const log = (msg, color, newLine) =>
  logger[newLine ? 'writeLn' : 'write'](color ? colors[color](msg) : msg);

module.exports = {
  err: (msg, noNewLine) => log(msg, 'red', !noNewLine),
  log: (msg, noNewLine) => log(msg, null, !noNewLine),
  ok: (msg, noNewLine) => log(msg, 'green', !noNewLine),
  warn: (msg, noNewLine) => log(msg, 'yellow', !noNewLine)
};
