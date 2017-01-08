'use strict';

var compress = require('./compress');
var wrapLoops = require('./wrapLoops');
var missingDependencies = require('./missingDependencies');

module.exports = {
  compress: compress,
  wrapLoops: wrapLoops,
  missingDependencies: missingDependencies
};
