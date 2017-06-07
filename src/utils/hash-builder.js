'use strict';

const crypto = require('crypto');

module.exports = {
  fromString: function(content) {
    const shasum = crypto.createHash('sha1');
    shasum.update(content);
    return shasum.digest('hex');
  }
};
