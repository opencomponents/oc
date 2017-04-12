'use strict';

const path = require('path');

module.exports = {
  getPackageName(templateType) {
    if (/.tgz$/.test(templateType)) {
      return templateType.match(/^(.*)-.*tgz$/)[1];
    } else if (~templateType.indexOf('@')) {
      return templateType.split('@')[0];
    }
    return path.basename(templateType);
  }
};