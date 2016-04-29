'use strict';

var fs = require('fs-extra');
var path = require('path');

module.exports = function(){
  return function(componentsDir){

    var nodeFolder = path.join(componentsDir, 'node_modules');

    if(!fs.existsSync(nodeFolder)){
      return [];
    }

    return fs.readdirSync(nodeFolder).filter(function(file){

      var filePath = path.resolve(nodeFolder, file),
          isBin = file === '.bin',
          isDir = fs.lstatSync(filePath).isDirectory();

      return isDir && !isBin;
    });
  };
};
