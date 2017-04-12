'use strict';

const async = require('async');
const semver = require('semver');
const _ = require('underscore');

const getUnixUTCTimestamp = require('../../../utils/get-unix-utc-timestamp');

module.exports = (conf, cdn) => ({

  getFromJson: callback => cdn.getJson(`${conf.s3.componentsDir}/components.json`, true, callback),

  getFromDirectories: (callback) => {
    const componentsInfo = {};

    const getVersionsForComponent = (componentName, cb) => {
      cdn.listSubDirectories(`${conf.s3.componentsDir}/${componentName}`, (err, versions) => {
        if(err){ return cb(err); }
        cb(null, versions.sort(semver.compare));
      });
    };

    cdn.listSubDirectories(conf.s3.componentsDir, (err, components) => {
      if(err){
        if(err.code === 'dir_not_found'){
          return callback(null, {
            lastEdit: getUnixUTCTimestamp(),
            components: []
          });
        }

        return callback(err);
      }

      async.map(components, getVersionsForComponent, (errors, versions) => {
        if(errors){ return callback(errors); }

        _.forEach(components, (component, i) => {
          componentsInfo[component] = versions[i];
        });

        callback(null, {
          lastEdit: getUnixUTCTimestamp(),
          components: componentsInfo
        });
      });
    });
  },

  save: (data, callback) => cdn.putFileContent(JSON.stringify(data), `${conf.s3.componentsDir}/components.json`, true, callback)
});
