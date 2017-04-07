'use strict';

const fs = require('fs-extra');
const path = require('path');

module.exports = function(){
  return function(componentsDir){

    const nodeFolder = path.join(componentsDir, 'node_modules');

    if(!fs.existsSync(nodeFolder)){
      return [];
    }

    return fs.readdirSync(nodeFolder).filter(function(file){

      let filePath = path.resolve(nodeFolder, file),
          isBin = file === '.bin',
          isDir = fs.lstatSync(filePath).isDirectory();

      return isDir && !isBin;
    });
  };
};
