'use strict';

var crypto = require('crypto');

module.exports = {
  fromString: function(content){
    var shasum = crypto.createHash('sha1');
    shasum.update(content);
    return shasum.digest('hex');
  }
};
