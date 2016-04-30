'use strict';

var fs = require('fs-extra');
var path = require('path');
var _ = require('underscore');

module.exports = function(dependencies){
  var logger = dependencies.logger;
  return function(componentsDir, callback){

    try {
      var components = fs.readdirSync(componentsDir).filter(function(file){

        var filePath = path.resolve(componentsDir, file),
            isDir = fs.lstatSync(filePath).isDirectory(),
            packagePath = path.join(filePath, 'package.json');

        if(!isDir || !fs.existsSync(packagePath)){
          return false;
        }

        var content;

        try {
          content = fs.readJsonSync(packagePath);
        }
        catch(err)
        {
          logger.log(('error reading ' + packagePath + ' ' + err.toString()).red);
          return false;
        }

        if(!content.oc || !!content.oc.packaged){
          return false;
        }

        return true;
      });

      var fullPathComponents = _.map(components, function(component){
        return path.resolve(componentsDir, component);
      });

      callback(null, fullPathComponents);

    } catch(err){
      return callback(err);
    }
  };
};
