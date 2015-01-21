'use strict';

var fs = require('fs-extra');
var path = require('path');
var _ = require('underscore');

module.exports = {
  config: {
    update: function(conf){
      return conf;
    }
  },
  S3: function(){

    return {
      getObject: function(conf, callback){
        var baseDirEnding = conf.Bucket.substr(conf.Bucket.length - 1),
            baseDir = conf.Bucket + ((baseDirEnding === '\\' || baseDirEnding === '/') ? '/' : ''),
            filePath = path.join(baseDir + '/', conf.Key);

        fs.readFile(filePath, function(err, res){
          if(err){
            return callback({
              message: 'The specified key does not exist.',
              code: 'NoSuchKey',
              time: '2014-10-31T17:23:23.913Z',
              statusCode: 404, 
              retryable: false,
              _willRetry: false
            });
          }

          callback(null, {
            AcceptRanges: 'bytes',
            LastModified: 'Tue, 13 May 2014 19:54:23 GMT',
            ContentLength: '441',
            ETag: '"d8af2cf72587b6c0afd09b18857431aa"',
            ContentType: 'application/octet-stream',
            Expires: 'Wed, 13 May 2015 19:54:21 GMT',
            ServerSideEncryption: 'AES256',
            Metadata: {},
            Body: res
          });
        });
      },
      listObjects: function(conf, callback){

        var baseDirEnding = conf.Bucket.substr(conf.Bucket.length - 1),
            baseDir = conf.Bucket + ((baseDirEnding === '\\' || baseDirEnding === '/') ? '/' : ''),
            dir = path.join(baseDir + '/', conf.Prefix);

        fs.readdir(dir, function(err, res){

          if(err){
            return callback(null, {
              Contents: [], 
              CommonPrefixes: [],
              Name: 'mock-test',
              Prefix: baseDir, 
              Marker: '',
              MaxKeys: 1000,
              Delimiter: conf.Delimiter,
              IsTruncated: false
            });
          }

          var list = res.filter(function(file){
            var isDir = fs.lstatSync(dir + '/' + file).isDirectory();
            return conf.Delimiter === '/' ? isDir : true;
          });

          callback(null, {
            Contents: [{
              Key: baseDir,
              LastModified: '2014-04-22T14:00:51.000Z',
              ETag: '"aProperEtagCode"',
              Size: 0,
              Owner: {
                ID: 'ownerKey',
                DisplayName: 'johnDoe'
              },
              StorageClass: 'STANDARD' 
            }],
            CommonPrefixes: _.map(list, function(el){
              return { Prefix: conf.Prefix + el + '/' };
            }),
            Name: 'mock-test',
            Prefix: baseDir,
            Marker: '',
            MaxKeys: 1000,
            Delimiter: conf.Delimiter,
            IsTruncated: false
          });

        });
      }
    };
  }
};