'use strict';

var fs = require('fs-extra');
var path = require('path');
var _ = require('underscore');

module.exports = function(){

  return function(componentsDir, callback){

    var isOcComponent = function(file){

      var filePath = path.resolve(componentsDir, file),
          packagePath = path.join(filePath, 'package.json');

      if(!fs.existsSync(packagePath)){
        return false;
      }

      var content;

      try {
        content = fs.readJsonSync(packagePath);
      }
      catch(err)
      {
        return false;
      }

      var packagedProperty = content.oc && content.oc.packaged;

      return _.isUndefined(packagedProperty);
    };

    var dirContent;

    try {
      dirContent = fs.readdirSync(componentsDir);
    } catch(err){
      return callback(null, []);
    }

    var components = dirContent.filter(isOcComponent).map(function(component) {
      return path.resolve(componentsDir, component);
    });

    callback(null, components);
  };
};
