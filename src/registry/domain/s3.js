'use strict';

const async = require('async');
const AWS = require('aws-sdk');
const Cache = require('nice-cache');
const format = require('stringformat');
const fs = require('fs-extra');
const nodeDir = require('node-dir');
const _ = require('lodash');
const minio = require('minio');

const getFileInfo = require('../../utils/get-file-info');
const getNextYear = require('../../utils/get-next-year');
const parseUrl = require('../../utils/parse-url');
const strings = require('../../resources');

const getMinioConfig = conf => {
  if (!conf.s3.minio) {
    return undefined;
  }
  const parsedUrl = parseUrl(conf.s3.endpoint);
  const config = {
    accessKey: conf.s3.key,
    secretKey: conf.s3.secret,
    secure: parsedUrl.protocol === 'https' ? true : false,
    endPoint: parsedUrl.hostname,
    port: parsedUrl.port
  };

  return config;
};

const getConfig = conf => {
  const httpOptions = { timeout: conf.s3.timeout || 10000 };
  if (conf.s3.agentProxy) {
    httpOptions.agent = conf.s3.agentProxy;
  }

  const config = {
    accessKeyId: conf.s3.key,
    secretAccessKey: conf.s3.secret,
    httpOptions
  };

  if (conf.s3.endpoint) {
    config.endpoint = conf.s3.endpoint;
  }
  if (conf.s3.region) {
    config.region = conf.s3.region;
  }
  if (conf.s3.signatureVersion) {
    config.signatureVersion = conf.s3.signatureVersion;
  }
  if (conf.s3.s3ForcePathStyle) {
    config.s3ForcePathStyle = conf.s3.s3ForcePathStyle;
  }
  return config;
};

module.exports = function(conf) {
  const httpOptions = { timeout: conf.s3.timeout || 10000 };
  if (conf.s3.agentProxy) {
    httpOptions.agent = conf.s3.agentProxy;
  }

  AWS.config.update(getConfig(conf));

  const bucket = conf.s3.bucket;
  const cache = new Cache({
    verbose: !!conf.verbosity,
    refreshInterval: conf.refreshInterval
  });

  const getS3Client = () => new AWS.S3();

  const getMinioClient = () => {
    const config = getMinioConfig(conf);
    if (!config) {
      return undefined;
    }
    return new minio.Client(getMinioConfig(conf));
  };

  const getFile = (filePath, force, callback) => {
    if (_.isFunction(force)) {
      callback = force;
      force = false;
    }

    const getFromAws = cb => {
      getS3Client().getObject(
        {
          Bucket: bucket,
          Key: filePath
        },
        (err, data) => {
          if (err) {
            return callback(
              err.code === 'NoSuchKey'
                ? {
                  code: strings.errors.s3.FILE_NOT_FOUND_CODE,
                  msg: format(strings.errors.s3.FILE_NOT_FOUND, filePath)
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
          code: strings.errors.s3.FILE_NOT_VALID_CODE,
          msg: format(strings.errors.s3.FILE_NOT_VALID, filePath)
        });
      }
    });
  };

  const getUrl = (componentName, version, fileName) =>
    `${conf.s3.path}${componentName}/${version}/${fileName}`;

  const listSubDirectories = (dir, callback) => {
    const normalisedPath =
      dir.lastIndexOf('/') === dir.length - 1 && dir.length > 0
        ? dir
        : dir + '/';

    getS3Client().listObjects(
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
            code: strings.errors.s3.DIR_NOT_FOUND_CODE,
            msg: format(strings.errors.s3.DIR_NOT_FOUND, dir)
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
    const upload = getS3Client().upload(obj);
    const updateACL = (fileName, isPrivate) => {
      const minioClient = getMinioClient();
      if (!minioClient || isPrivate) {
        callback();
        return;
      }
      minioClient.setBucketPolicy(
        bucket,
        fileName,
        minio.Policy.READONLY,
        err => {
          if (err) throw err;
          console.log('done ', bucket, fileName, isPrivate);
          callback();
        }
      );
    };
    upload.send(updateACL(fileName, isPrivate));
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
    putFileContent
  };
};
