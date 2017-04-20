'use strict';

const path = require('path');
const _ = require('lodash');

module.exports = function(dependencies){

  const missing = [];

  _.forEach(dependencies, (npmModule) => {

    const index = npmModule.indexOf('@');
    let moduleName = npmModule;

    if (index > 0) {
      moduleName = npmModule.substr(0, index);
    }
    const pathToModule = path.resolve('node_modules/', moduleName);

    try {
      if(require.cache[pathToModule]){
        delete require.cache[pathToModule];
      }

      require(pathToModule);
    } catch (exception) {
      missing.push(npmModule);
    }
  });

  return missing;
};
