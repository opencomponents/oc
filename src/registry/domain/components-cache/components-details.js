'use strict';

const async = require('async');
const _ = require('underscore');

const getUnixUTCTimestamp = require('../../../utils/get-unix-utc-timestamp');

module.exports = (conf, cdn) => {

  const filePath = () => `${conf.s3.componentsDir}/components-details.json`;

  return {

    getFromJson: callback => cdn.getJson(filePath(), true, callback),

    getFromDirectories: (components, details, callback) => {

      details = details || {};
      details.components = details.components || {};

      async.eachOfSeries(components, (versions, name, done) => {

        details.components[name] = details.components[name] || {};

        async.eachLimit(versions, cdn.maxConcurrentRequests, (version, next) => {
          if(details.components[name][version]){
            next();
          } else {
            cdn.getJson(`${conf.s3.componentsDir}/${name}/${version}/package.json`, true, (err, content) => {
              if(err){ return next(err); }
              details.components[name][version] = { publishDate: content.oc.date || 0 };
              next();
            });          
          }
        }, done);
      }, (err) => callback(err, {
        lastEdit: getUnixUTCTimestamp(),
        components: details.components
      }));
    },

    save: (data, callback) => cdn.putFileContent(JSON.stringify(data), filePath(), true, callback)
  };
};
