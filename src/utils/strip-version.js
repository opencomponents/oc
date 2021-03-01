const path = require('path');

module.exports = dependency => {
  const parts = path.parse(dependency);
  return path.join(parts.dir, parts.base.split('@')[0]);
};
