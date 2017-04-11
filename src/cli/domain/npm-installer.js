'use strict';

const npm = require('npm');
const path = require('path');

module.exports = function(dependencies, cb){
  npm.load({}, (npmEr) => {
    if(npmEr){ return cb(npmEr); }
    npm.commands.install(path.resolve('.'), dependencies, cb);
  });
};