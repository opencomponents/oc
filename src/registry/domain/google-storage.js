'use strict';

const async = require('async');
const Cache = require('nice-cache');
const format = require('stringformat');
const fs = require('fs-extra');
const nodeDir = require('node-dir');
const _ = require('lodash');
const Storage = require('@google-cloud/storage');

const getFileInfo = require('../../utils/get-file-info');
const getNextYear = require('../../utils/get-next-year');
const parseUrl = require('../../utils/parse-url');
const strings = require('../../resources');

module.exports = function(conf) {
  const getClient = () => {
    const client = Storage({
      projectId: conf.gs.projectId
    });
    return client;
  };
  const bucketName = conf.gs.bucket;
  const cache = new Cache({
    verbose: !!conf.verbosity,
    refreshInterval: conf.refreshInterval
  });

  const getFile = (filePath, force, callback) => {
    if (_.isFunction(force)) {
      callback = force;
      force = false;
    }

    const getFromGs = cb => {
      getClient()
        .bucket(bucketName)
        .file(filePath)
        .download()
        .then(data => {
          cb(null, data.toString());
        })
        .catch(err => {
          console.error('ERROR:', err.code);
          return callback(
            err.code === 404
              ? {
                code: strings.errors.s3.FILE_NOT_FOUND_CODE,
                msg: format(strings.errors.s3.FILE_NOT_FOUND, filePath)
              }
              : err
          );
        });
    };

    if (force) {
      return getFromGs(callback);
    }

    const cached = cache.get('gs-file', filePath);

    if (cached) {
      return callback(null, cached);
    }

    getFromGs((err, result) => {
      if (err) {
        return callback({ code: err.code, msg: err.message });
      }
      cache.set('gs-file', filePath, result);
      cache.sub('gs-file', filePath, getFromGs);
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
        return callback({ code: err.code, msg: err.message });
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
    `${conf.gs.path}${componentName}/${version}/${fileName}`;

  const listSubDirectories = (dir, callback) => {
    const normalisedPath =
      dir.lastIndexOf('/') === dir.length - 1 && dir.length > 0
        ? dir
        : dir + '/';
    const options = {
      prefix: normalisedPath
    };
    getClient()
      .bucket(bucketName)
      .getFiles(options)
      .then(results => {
        const files = results[0];
        //console.log(files);
        if (files.length === 0) {
          throw 'no files';
        }

        // const result = files
        //   .filter(file => file.name.split('/').length > normalisedPath.split('/').length)
        //   .map(file => file.name.split('/')[1])
        //   .filter(function(item, i, ar){ return ar.indexOf(item) === i; });

        //This seems hacky I am not sure how to just get the directories.
        //Would all components have a package.json?
        const result = files
          .filter(file => file.name.includes('package.json'))
          .map(file => {
            const fileName = file.name.replace(normalisedPath, '');
            const fileSplit = fileName.split('/');
            return fileSplit[0];
          });
        callback(null, result);
      })
      .catch(err =>
        callback({
          code: strings.errors.s3.DIR_NOT_FOUND_CODE,
          msg: format(strings.errors.s3.DIR_NOT_FOUND, dir)
        })
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
    const tmp = require('tmp');
    const name = tmp.tmpNameSync();

    const fs = require('fs');
    fs.writeFileSync(name, fileContent);
    putFile(name, fileName, isPrivate, callback);
  };

  const putFile = (filePath, fileName, isPrivate, callback) => {
    getClient()
      .bucket(bucketName)
      .upload(filePath, { destination: fileName })
      .then(() => {
        if (!isPrivate) {
          getClient()
            .bucket(bucketName)
            .file(fileName)
            .makePublic()
            .then(() => {
              callback();
            })
            .catch(err => {
              console.error('ERROR making public:', err);
              return callback({ code: err.code, msg: err.message });
            });
        } else {
          callback();
        }
      })
      .catch(err => {
        console.error('ERROR:', err.code);
        return callback({ code: err.code, msg: err.message });
      });
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
