'use strict';

const fs = require('fs-extra');
const path = require('path');

module.exports = function(tempDirPath, callback) {
  return fs.readJson(path.join(tempDirPath, 'package.json'), callback);
};
