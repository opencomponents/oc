'use strict';

module.exports.parse = (code) => {
  const names = [];
  const parts = code.split('plugins');
  for (let index = 1; index < parts.length; index++) {
    const part = parts[index];
    const parenthesis = part.indexOf('(');
    if (part.indexOf('&&') === -1) {
      names.push(part.substring(1, parenthesis));
    }
  }
  return names;
};
