'use strict';

const async = require('async');
const semver = require('semver');
const _ = require('lodash');

const getUnixUTCTimestamp = require('oc-get-unix-utc-timestamp');

module.exports = (conf, cdn) => {
  const filePath = () =>
    `${conf.storage.options.componentsDir}/components.json`;

  const componentsList = {
    getFromJson: callback => cdn.getJson(filePath(), true, callback),

    getFromDirectories: callback => {
      const componentsInfo = {};

      const getVersionsForComponent = (componentName, cb) => {
        cdn.listSubDirectories(
          `${conf.storage.options.componentsDir}/${componentName}`,
          (err, versions) => {
            if (err) {
              return cb(err);
            }
            cb(null, versions.sort(semver.compare));
          }
        );
      };

      cdn.listSubDirectories(
        conf.storage.options.componentsDir,
        (err, components) => {
          if (err) {
            if (err.code === 'dir_not_found') {
              return callback(null, {
                lastEdit: getUnixUTCTimestamp(),
                components: []
              });
            }

            return callback(err);
          }

          async.map(components, getVersionsForComponent, (errors, versions) => {
            if (errors) {
              return callback(errors);
            }

            _.forEach(components, (component, i) => {
              componentsInfo[component] = versions[i];
            });

            callback(null, {
              lastEdit: getUnixUTCTimestamp(),
              components: componentsInfo
            });
          });
        }
      );
    },

    refresh: callback => {
      componentsList.getFromDirectories((err, components) => {
        if (err) {
          return callback(err);
        }
        componentsList.save(components, err => {
          if (err) {
            return callback(err);
          }
          callback(err, components);
        });
      });
    },

    save: (data, callback) =>
      cdn.putFileContent(JSON.stringify(data), filePath(), true, callback)
  };

  return componentsList;
};
