'use strict';

const async = require('async');
const format = require('stringformat');
const fs = require('fs-extra');
const minifyFile = require('./minify-file');
const nodeDir = require('node-dir');
const path = require('path');
const _ = require('lodash');

const strings = require('../../../resources');

const copyDir = function(params, cb){
  const staticPath = path.join(params.componentPath, params.staticDir),
    exists = fs.existsSync(staticPath),
    isDir = exists && fs.lstatSync(staticPath).isDirectory();

  if(!exists){
    return cb(format(strings.errors.cli.FOLDER_NOT_FOUND, staticPath));
  } else if(!isDir){
    return cb(format(strings.errors.cli.FOLDER_IS_NOT_A_FOLDER, staticPath));
  } else {

    nodeDir.paths(staticPath, (err, res) => {
      _.forEach(res.files, (filePath) => {

        const fileName = path.basename(filePath),
          fileExt = path.extname(filePath).toLowerCase(),
          fileRelativePath = path.relative(staticPath, path.dirname(filePath)),
          fileDestinationPath = path.join(params.publishPath, params.staticDir, fileRelativePath),
          fileDestination = path.join(fileDestinationPath, fileName);

        fs.ensureDirSync(fileDestinationPath);

        if(params.minify && params.ocOptions.minify !== false && (fileExt === '.js' || fileExt === '.css')){
          const fileContent = fs.readFileSync(filePath).toString(),
            minified = minifyFile(fileExt, fileContent);

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

  const staticList = params.ocOptions.files.static;

  if(staticList.length === 0){
    return callback(null, 'ok');
  }

  async.eachSeries(staticList, (staticDir, cb) => {
    copyDir(_.extend(params, { staticDir: staticDir }), cb);
  }, (errors) => {
    if(errors){ return callback(errors); }
    callback(null, 'ok');
  });
};