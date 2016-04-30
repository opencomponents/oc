'use strict';

var npm = require('npm');
var path = require('path');

module.exports = function(dependencies, baseDir, cb){
  npm.load({}, function(npmEr){
    if(!!npmEr){ return cb(npmEr); }
    npm.commands.install(path.resolve(baseDir), dependencies, cb);
  });
};