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

  var repository = new Repository(options);

  var fetchComponentsInfo = function(cb){
    repository.getComponentsInfoFromJson(function(err, res){
      if(!!err){
        repository.getComponentsInfoFromDirectories(function(err, res){
          console.log(colors.yellow('Updating components definition on library...'));
          repository.saveComponentsInfo(res, function(err, result){
            cb(err, res);
          });
        });
      } else {
        cb(err, res);
      }
    });
  };

  console.log(format(colors.yellow('Connecting to library: {0}/{1}'), options.s3.bucket, options.s3.componentsDir));

  fetchComponentsInfo(function(err, componentsInfo){

    if(err){
      return console.log(colors.red(err));
    }

    var componentsCount = _.keys(componentsInfo.components).length,
        componentsVersions = _.reduce(_.map(componentsInfo.components, function(component){
          return component.length;
        }), function(memo, num){ return memo + num; }, 0);

    console.log(format(colors.green('{0} components found with {1} versions published'), componentsCount, componentsVersions));
    console.log(format(colors.yellow('Ensuring oc-client@{0} is available on library...'), packageInfo.version));

    if(!componentsInfo.components['oc-client'] || !_.contains(componentsInfo.components['oc-client'], packageInfo.version)){

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