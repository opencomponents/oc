'use strict';

var format = require('stringformat');
var fs = require('fs-extra');
var path = require('path');

var CONST_MAX_ITERATIONS = require('../../../resources/settings').maxLoopIterations;
var hashBuilder = require('../../../utils/hash-builder');
var strings = require('../../../resources');

var getSandBoxedJs = require('./getSandBoxedJs');
var getLocalDependencies = require('./getLocalDependencies')(fs, path);
var missingDependencies = require('./missingDependencies');


module.exports = function(params, callback){
  var dataPath = path.join(params.componentPath, params.ocOptions.files.data);
  var fileName = 'server.js';
  var wrappedRequires;
  var sandboxedJs;
  var serverContent = fs.readFileSync(dataPath).toString();

  try {
    wrappedRequires = getLocalDependencies(params.componentPath, serverContent, params.ocOptions.files.data);
  } catch(e){
    return callback(e);
  }

  var missingDeps = missingDependencies(wrappedRequires.modules, params.dependencies);

  if(missingDeps.length > 0){
    return callback(new Error(format(strings.errors.cli.SERVERJS_DEPENDENCY_NOT_DECLARED, JSON.stringify(missingDeps))));
  }

  try {
    sandboxedJs = getSandBoxedJs(wrappedRequires.files, serverContent, params.ocOptions.files.data, CONST_MAX_ITERATIONS);
  } catch(e){
    return callback(e);
  }

  fs.writeFile(path.join(params.publishPath, fileName), sandboxedJs, function(err, res){
    callback(err, {
      type: 'node.js',
      hashKey: hashBuilder.fromString(sandboxedJs),
      src: fileName
    });
  });
};
