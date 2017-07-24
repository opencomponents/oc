'use strict';

const fs = require('fs-extra');

module.exports = function({ componentPath }) {
  fs.ensureDirSync(componentPath);
};
