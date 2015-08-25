'use strict';

var async = require('async');
var CleanCss = require('clean-css');
var fs = require('fs-extra');
var nodeDir = require('node-dir');
var path = require('path');
var uglifyJs = require('uglify-js');
var _ = require('underscore');

var minifyFile = function(fileType, fileContent, ocOptions){

  if(fileType === '.js'){
    return uglifyJs.minify(fileContent, { fromString: true }).code;
  } else if(fileType === '.css'){
    var options = (ocOptions.ie8css === true) ? { compatibility:'ie8' } : null;
    return new CleanCss(options).minify(fileContent).styles;
  }

  return fileContent;
};

var copyDir = function(params, cb){
  var staticPath = path.join(params.componentPath, params.staticDir);
  if(!fs.existsSync(staticPath)){
    return cb('"' + staticPath + '" not found');
  } else if(!fs.lstatSync(staticPath).isDirectory()){
    return cb('"' + staticPath + '" must be a directory');
  } else {

    nodeDir.paths(staticPath, function(err, res){
      _.forEach(res.files, function(filePath){
    
        var fileName = path.basename(filePath),
            fileExt = path.extname(filePath).toLowerCase(),
            fileRelativePath = path.relative(staticPath, path.dirname(filePath)),
            fileDestinationPath = path.join(params.publishPath, params.staticDir, fileRelativePath),
            fileDestination = path.join(fileDestinationPath, fileName);

        fs.ensureDirSync(fileDestinationPath);

        if(params.minify && params.ocOptions.minify !== false && (fileExt === '.js' || fileExt === '.css')){
          var fileContent = fs.readFileSync(filePath).toString(),
              minified = minifyFile(fileExt, fileContent, params.ocOptions);

          fs.writeFileSync(fileDestination, minified);
        } else {
          fs.copySync(filePath, fileDestination);
        }
      });
      cb(null, 'ok');
    });
  }
};

module.exports = function(params, callback){
  if(params.ocOptions.files.static.length === 0){
    return callback(null, 'ok');
  }

  async.eachSeries(params.ocOptions.files.static, function(staticDir, cb){
    copyDir(_.extend(params, { staticDir: staticDir }), cb);
  }, function(errors){
    if(errors){ return callback(errors); }
    callback(null, 'ok');
  });
};