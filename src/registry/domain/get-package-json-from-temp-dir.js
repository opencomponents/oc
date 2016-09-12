'use strict';

var fs = require('fs-extra');
var path = require('path');

module.exports = function(tempDirPath, callback){
  return fs.readJson(path.join(tempDirPath, 'package.json'), callback);
};