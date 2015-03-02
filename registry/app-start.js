'use strict';

var colors = require('colors/safe');
var format = require('stringformat');
var packageInfo = require('../package.json');
var path = require('path');
var Repository = require('./domain/repository');
var _ = require('underscore');

module.exports = function(options, callback){

  if(options.local){
    return callback(null, 'ok');
  }

  console.log(format(colors.yellow('Connecting to bucket: {0}/{1}'), options.s3.bucket, options.s3.componentsDir));
  console.log(format(colors.yellow('Ensuring oc-client@{0} is available on library...'), packageInfo.version));

  var repository = new Repository(options);

  repository.getComponent('oc-client', packageInfo.version, function(err, res){

    if(!!err){
      console.log(colors.yellow('Component not found. Publishing it...'));

      var componentPath = path.resolve(__dirname, '../components/oc-client/_package');
      
      repository.publishComponent(componentPath, 'oc-client', packageInfo.version, function(err, res){
        if(!err){
          console.log(colors.green('Component published.'));
        } else {
          console.log(colors.red(format('Component not published: {0}', _.first(err).message)));
        }

        callback(err, res);
      });
    } else {
      console.log(colors.green('Component is available on library.'));
      callback(null, 'ok');
    }
  });
};