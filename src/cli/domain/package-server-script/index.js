'use strict';

var fs = require('fs-extra');
var path = require('path');
var hashBuilder = require('../../../utils/hash-builder');
var bundle = require('./bundle');

module.exports = function(params, callback){
  var dataPath = path.join(params.componentPath, params.ocOptions.files.data);
  var fileName = 'server.js';
  var serverContent = fs.readFileSync(dataPath).toString();

  bundle(serverContent, fileName, function(bundledServer){
    fs.writeFile(path.join(params.publishPath, fileName), bundledServer, function(err, res){
      callback(err, {
        type: 'node.js',
        hashKey: hashBuilder.fromString(bundledServer),
        src: fileName
      });
    });
  });
};
