'use strict';

const async = require('async');
const AWS = require('aws-sdk');
const Cache = require('nice-cache');
const format = require('stringformat');
const fs = require('fs-extra');
const nodeDir = require('node-dir');
const _ = require('lodash');

const getFileInfo = require('../../utils/get-file-info');
const getNextYear = require('../../utils/get-next-year');
const strings = require('../../resources');
module.exports = function(conf) {
  const httpOptions = { timeout: conf.timeout || 10000 };
  if (conf.agentProxy) {
    httpOptions.agent = conf.agentProxy;
  }

  AWS.config.update({
    accessKeyId: conf.key,
    secretAccessKey: conf.secret,
    region: conf.region,
    httpOptions
  });

  const bucket = conf.bucket;
  const cache = new Cache({
    verbose: !!conf.verbosity,
    refreshInterval: conf.refreshInterval
  });

  const getClient = () => new AWS.S3();

  const getFile = (filePath, force, callback) => {
    if (_.isFunction(force)) {
      callback = force;
      force = false;
    }

    const getFromAws = cb => {
      getClient().getObject(
        {
          Bucket: bucket,
          Key: filePath
        },
        (err, data) => {
          if (err) {
            return callback(
              err.code === 'NoSuchKey'
                ? {
                  code: strings.errors.STORAGE.FILE_NOT_FOUND_CODE,
                  msg: format(strings.errors.STORAGE.FILE_NOT_FOUND, filePath)
                }
                : err
            );
          }

          cb(null, data.Body.toString());
        }
      );
    };

    if (force) {
      return getFromAws(callback);
    }

    const cached = cache.get('s3-file', filePath);

    if (cached) {
      return callback(null, cached);
    }

    getFromAws((err, result) => {
      if (err) {
        return callback(err);
      }
      cache.set('s3-file', filePath, result);
      cache.sub('s3-file', filePath, getFromAws);
      callback(null, result);
    });
  };

  const getJson = (filePath, force, callback) => {
    if (_.isFunction(force)) {
      callback = force;
      force = false;
    }

    getFile(filePath, force, (err, file) => {
      if (err) {
        return callback(err);
      }

      try {
        callback(null, JSON.parse(file));
      } catch (er) {
        return callback({
          code: strings.errors.STORAGE.FILE_NOT_VALID_CODE,
          msg: format(strings.errors.STORAGE.FILE_NOT_VALID, filePath)
        });
      }
    });
  };

  const getUrl = (componentName, version, fileName) =>
    `${conf.path}${componentName}/${version}/${fileName}`;

  const listSubDirectories = (dir, callback) => {
    const normalisedPath =
      dir.lastIndexOf('/') === dir.length - 1 && dir.length > 0
        ? dir
        : dir + '/';

    getClient().listObjects(
      {
        Bucket: bucket,
        Prefix: normalisedPath,
        Delimiter: '/'
      },
      (err, data) => {
        if (err) {
          return callback(err);
        }

        if (data.CommonPrefixes.length === 0) {
          return callback({
            code: strings.errors.STORAGE.DIR_NOT_FOUND_CODE,
            msg: format(strings.errors.STORAGE.DIR_NOT_FOUND, dir)
          });
        }

        const result = _.map(data.CommonPrefixes, commonPrefix =>
          commonPrefix.Prefix.substr(
            normalisedPath.length,
            commonPrefix.Prefix.length - normalisedPath.length - 1
          )
        );

        callback(null, result);
      }
    );
  };

  const putDir = (dirInput, dirOutput, callback) => {
    nodeDir.paths(dirInput, (err, paths) => {
      async.each(
        paths.files,
        (file, cb) => {
          const relativeFile = file.substr(dirInput.length),
            url = (dirOutput + relativeFile).replace(/\\/g, '/');

          putFile(file, url, relativeFile === '/server.js', cb);
        },
        callback
      );
    });
  };

  const putFileContent = (fileContent, fileName, isPrivate, callback) => {
    const fileInfo = getFileInfo(fileName),
      obj = {
        Bucket: bucket,
        Key: fileName,
        Body: fileContent,
        ACL: isPrivate ? 'authenticated-read' : 'public-read',
        ServerSideEncryption: 'AES256',
        Expires: getNextYear()
      };

    if (fileInfo.mimeType) {
      obj.ContentType = fileInfo.mimeType;
    }

    if (fileInfo.gzip) {
      obj.ContentEncoding = 'gzip';
    }
    const upload = getClient().upload(obj);
    upload.send(callback);
  };

  const putFile = (filePath, fileName, isPrivate, callback) => {
    try {
      const stream = fs.createReadStream(filePath);
      putFileContent(stream, fileName, isPrivate, callback);
    } catch (e) {
      callback(e);
    }
  };

  return {
    getFile,
    getJson,
    getUrl,
    listSubDirectories,
    maxConcurrentRequests: 20,
    putDir,
    putFile,
    putFileContent,
    adapterType: 's3'
  };
};
