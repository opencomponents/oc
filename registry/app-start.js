'use strict';

var colors = require('colors');
var format = require('../utils/format');
var packageInfo = require('../package.json');
var path = require('path');
var Repository = require('./domain/repository');
var _ = require('underscore');

module.exports = function(options, callback){

  if(options.local){
    return callback(null, 'ok');
  }

  console.log(format('Connecting to library: https:{0}'.yellow, options.s3.path + options.s3.componentsDir));
  console.log(format('Ensuring oc-client@{0} is available on library...'.yellow, packageInfo.version));

  var repository = new Repository(options);

  repository.getComponent('oc-client', packageInfo.version, function(err, res){

    if(!!err){
      console.log('Component not found. Publishing it...'.yellow);

      var componentPath = path.resolve(__dirname, '../components/oc-client/_package');
      
      repository.publishComponent(componentPath, 'oc-client', packageInfo.version, function(err, res){
        if(!err){
          console.log('Component published.'.green);
        }
        
        callback(err, res);
      });
    } else {
      console.log('Component is available on library.'.green);
      callback(null, 'ok');
    }
  });
};