'use strict';

const async = require('async');
const AWS = require('aws-sdk');
const Cache = require('nice-cache');
const format = require('stringformat');
const fs = require('fs-extra');
const nodeDir = require('node-dir');
const _ = require('underscore');

const getFileInfo = require('../../utils/get-file-info');
const getNextYear = require('../../utils/get-next-year');
const strings = require('../../resources');

module.exports = function(conf){

  AWS.config.update({
    accessKeyId: conf.s3.key,
    secretAccessKey: conf.s3.secret,
    region: conf.s3.region,
    httpOptions: { timeout: conf.s3.timeout || 10000 }
  });

  const bucket = conf.s3.bucket,
    cache = new Cache({
      verbose: !!conf.verbosity,
      refreshInterval: conf.refreshInterval
    });

  return {
    listSubDirectories: function(dir, callback){

      const normalisedPath = dir.lastIndexOf('/') === (dir.length - 1) && dir.length > 0 ? dir : dir + '/';
      const client = new AWS.S3();

      client.listObjects({
        Bucket: bucket,
        Prefix: normalisedPath,
        Delimiter: '/'
      }, function (err, data) {
        if(err){ return callback(err); }

        if(data.CommonPrefixes.length === 0){
          return callback({ 
            code: strings.errors.s3.DIR_NOT_FOUND_CODE,
            msg: format(strings.errors.s3.DIR_NOT_FOUND, dir)
          });
        }

        const result = _.map(data.CommonPrefixes, function(commonPrefix){
          return commonPrefix.Prefix.substr(normalisedPath.length, commonPrefix.Prefix.length - normalisedPath.length - 1);
        });

        callback(null, result);
      });
    },
    getFile: function(filePath, force, callback){

      if(_.isFunction(force)){
        callback = force;
        force = false;
      }

      const getFromAws = function(callback){
        const client = new AWS.S3();

        client.getObject({
          Bucket: bucket,
          Key: filePath
        }, function(err, data){
          if(err){ 
            return callback(err.code === 'NoSuchKey' ? {
              code: strings.errors.s3.FILE_NOT_FOUND_CODE,
              msg: format(strings.errors.s3.FILE_NOT_FOUND, filePath)
            } : err);
          }

          callback(null, data.Body.toString());
        });
      };

      if(force){
        return getFromAws(callback);
      }

      const cached = cache.get('s3-file', filePath);

      if(cached){
        return callback(null, cached);
      }

      getFromAws(function(err, result){
        if(err){ return callback(err); }
        cache.set('s3-file', filePath, result);
        cache.sub('s3-file', filePath, getFromAws);
        callback(null, result);
      });

    },
    getUrl: function(componentName, version, fileName){
      return conf.s3.path + componentName + '/' + version + '/' + fileName;
    },
    putDir: function(dirInput, dirOutput, callback){

      const self = this;

      nodeDir.paths(dirInput, function(err, paths) {
        const files = paths.files;

        async.each(files, function(file, cb){
          const relativeFile = file.substr(dirInput.length),
            url = (dirOutput + relativeFile).replace(/\\/g, '/');

          self.putFile(file, url, relativeFile === '/server.js', cb);
        }, function(errors){
          if(errors){
            return callback(_.compact(errors));
          }

          callback(null, 'ok');
        });
      });
    },
    putFile: function(filePath, fileName, isPrivate, callback){
      const self = this;
      
      fs.readFile(filePath, function(err, fileContent){
        if(err){ return callback(err); }
        self.putFileContent(fileContent, fileName, isPrivate, callback);
      });
    },
    putFileContent: function(fileContent, fileName, isPrivate, callback){

      const fileInfo = getFileInfo(fileName),
        obj = {
          Bucket: bucket,
          Key: fileName,
          Body: fileContent,
          ACL: isPrivate ? 'authenticated-read' : 'public-read',
          ServerSideEncryption: 'AES256',
          Expires: getNextYear()
        };

      if(fileInfo.mimeType){
        obj.ContentType = fileInfo.mimeType;
      }

      if(fileInfo.gzip){
        obj.ContentEncoding = 'gzip';
      }

      const client = new AWS.S3();
      client.putObject(obj, callback);
    }
  };
};
