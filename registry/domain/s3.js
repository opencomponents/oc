'use strict';

var Cache = require('nice-cache');
var format = require('stringformat');
var fs = require('fs-extra');
var nodeDir = require('node-dir');
var giveMe = require('give-me');
var strings = require('../../resources');
var _ = require('underscore');

module.exports = function(s3, conf){

  var cache = new Cache(conf.cache);

  var getNextYear = function(){
    return new Date((new Date()).setYear((new Date()).getFullYear() + 1));
  };

  return {
    listSubDirectories: function(dir, callback){

      var normalisedPath = dir.lastIndexOf('/') === (dir.length - 1) && dir.length > 0 ? dir : dir + '/',
          cached = cache.get('s3-dir', normalisedPath);

      if(!!cached){
        return callback(null, cached);
      }

      var getFromAws = function(callback){
        s3.client.listObjects({
          Bucket: s3.bucket,
          Prefix: normalisedPath,
          Delimiter: '/'
        }, function (err, data) {
          if (err) { return callback(err); }

          if(data.CommonPrefixes.length === 0){
            return callback({ 
              code: strings.errors.s3.DIR_NOT_FOUND_CODE,
              msg: format(strings.errors.s3.DIR_NOT_FOUND, dir)
            });
          }

          var result = _.map(data.CommonPrefixes, function(commonPrefix){
            return commonPrefix.Prefix.substr(normalisedPath.length, commonPrefix.Prefix.length - normalisedPath.length - 1);
          });

          callback(null, result);
        });
      };

      getFromAws(function(err, result){
        if (err) { return callback(err); }
        cache.set('s3-dir', normalisedPath, result);
        cache.sub('s3-dir', normalisedPath, getFromAws);
        callback(null, result);
      });
    },
    getFile: function(filePath, callback){

      var cached = cache.get('s3-file', filePath);

      if(!!cached){
        return callback(null, cached);
      }

      var getFromAws = function(callback){
        s3.client.getObject({
          Bucket: s3.bucket,
          Key: filePath
        }, function (err, data){
          if (err) { 
            return callback(err.code === 'NoSuchKey' ? {
              code: strings.errors.s3.FILE_NOT_FOUND_CODE,
              msg: format(strings.errors.s3.FILE_NOT_FOUND, filePath)
            } : err);
          }

          callback(null, data.Body.toString());
        });
      };

      getFromAws(function(err, result){
        if (err) { return callback(err); }
        cache.set('s3-file', filePath, result);
        cache.sub('s3-file', filePath, getFromAws);
        callback(null, result);
      });

    },
    getUrl: function(componentName, version, fileName){
      return s3.path + componentName + '/' + version + '/' + fileName;
    },
    putDir: function(dirInput, dirOutput, callback){

      var self = this;

      nodeDir.paths(dirInput, function(err, paths) {
        var files = paths.files;

        giveMe.all(self.putFile, _.map(files, function(file){
          var relativeFile = file.substr(dirInput.length),
              url = dirOutput + relativeFile;
          
          return [file, url, relativeFile === '/server.js'];
        }), function(errors, callbacks){

          if(errors){
            return callback(_.compact(errors));
          }

          var cachedKeysToRefresh = [];

          _.forEach(dirOutput.split('/'), function(dirSegment, i){
            var cacheKey = dirOutput.split('/').slice(0, i + 1).join('/') + '/',
                cachedValue = cache.get('s3-dir', cacheKey);

            if(!!cachedValue){
              cachedKeysToRefresh.push(cacheKey);
            }
          });

          if(cachedKeysToRefresh.length === 0){
            return callback(null, 'ok');
          } else {
            giveMe.all(cache.refresh, _.map(cachedKeysToRefresh, function(cachedKeyToRefresh){
              return ['s3-dir', cachedKeyToRefresh];
            }), function(errors, results){
              callback(errors, results);
            });
          }
        });
      });
    },
    putFile: function(filePath, fileName, isPrivate, callback){

      var fileContent = fs.readFileSync(filePath);

      s3.client.putObject({
          Bucket: s3.bucket,
          Key: fileName,
          Body: fileContent,
          ACL: isPrivate ? 'authenticated-read' : 'public-read',
          ServerSideEncryption: 'AES256',
          Expires: getNextYear()
      }, function (err, res) {
          callback(err, res);
      });
    }
  };
};
