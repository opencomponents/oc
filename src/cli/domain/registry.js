'use strict';

const format = require('stringformat');
const fs = require('fs-extra');
const path = require('path');
const request = require('minimal-request');
const _ = require('lodash');

const put = require('../../utils/put');
const settings = require('../../resources/settings');
const urlBuilder = require('../../registry/domain/url-builder');
const urlParser = require('../domain/url-parser');

const getOcVersion = function() {
  const ocPackagePath = path.join(__dirname, '../../../package.json'),
    ocInfo = fs.readJsonSync(ocPackagePath);

  return ocInfo.version;
};

module.exports = function(opts) {
  opts = opts || {};

  let requestsHeaders = {
    'user-agent': format(
      'oc-cli-{0}/{1}-{2}-{3}',
      getOcVersion(),
      process.version,
      process.platform,
      process.arch
    )
  };

  return _.extend(this, {
    add: function(registry, callback) {
      if (registry.slice(registry.length - 1) !== '/') {
        registry += '/';
      }

      request(
        {
          url: registry,
          headers: requestsHeaders,
          json: true
        },
        (err, apiResponse) => {
          if (err || !apiResponse) {
            return callback('oc registry not available', null);
          } else if (apiResponse.type !== 'oc-registry') {
            return callback('not a valid oc registry', null);
          }

          fs.readJson(settings.configFile.src, (err, res) => {
            if (err) {
              res = {};
            }

            if (!res.registries) {
              res.registries = [];
            }

            if (!_.includes(res.registries, registry)) {
              res.registries.push(registry);
            }

            fs.writeJson(settings.configFile.src, res, callback);
          });
        }
      );
    },
    get: function(callback) {
      if (opts.registry) {
        return callback(null, [opts.registry]);
      }

      fs.readJson(settings.configFile.src, (err, res) => {
        if (err || !res.registries || res.registries.length === 0) {
          return callback('No oc registries');
        }

        return callback(null, res.registries);
      });
    },
    getApiComponentByHref: function(href, callback) {
      request(
        {
          url: href + settings.registry.componentInfoPath,
          headers: requestsHeaders,
          json: true
        },
        callback
      );
    },
    getComponentPreviewUrlByUrl: function(componentHref, callback) {
      request(
        {
          url: componentHref,
          headers: requestsHeaders,
          json: true
        },
        (err, res) => {
          if (err) {
            return callback(err);
          }

          const parsed = urlParser.parse(res);
          callback(
            null,
            urlBuilder.componentPreview(parsed, parsed.registryUrl)
          );
        }
      );
    },
    putComponent: function(options, callback) {
      if (!!options.username && !!options.password) {
        requestsHeaders = _.extend(requestsHeaders, {
          Authorization:
            'Basic ' +
            new Buffer(options.username + ':' + options.password).toString(
              'base64'
            )
        });
      }

      put(options.route, options.path, requestsHeaders, (err, res) => {
        if (err) {
          if (!_.isObject(err)) {
            try {
              err = JSON.parse(err);
            } catch (er) {}
          }

          if (!!err.code && err.code === 'ECONNREFUSED') {
            err = 'Connection to registry has not been established';
          } else if (
            err.code !== 'cli_version_not_valid' &&
            err.code !== 'node_version_not_valid' &&
            !!err.error
          ) {
            err = err.error;
          }

          return callback(err);
        }

        callback(err, res);
      });
    },
    remove: function(registry, callback) {
      fs.readJson(settings.configFile.src, (err, res) => {
        if (err) {
          res = {};
        }

        if (!res.registries) {
          res.registries = [];
        }

        res.registries = _.without(res.registries, registry);
        fs.writeJson(settings.configFile.src, res, callback);
      });
    }
  });
};
