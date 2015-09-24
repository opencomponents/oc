'use strict';

var async = require('async');
var format = require('stringformat');
var fs = require('fs-extra');
var path = require('path');
var _ = require('underscore');

var put = require('../../utils/put');
var querystring = require('querystring');
var request = require('../../utils/request');
var settings = require('../../resources/settings');
var urlBuilder = require('../../registry/domain/url-builder');
var urlParser = require('../domain/url-parser');

var getOcVersion = function(){

  var ocPackagePath = path.join(__dirname, '../../package.json'),
      ocInfo = fs.readJsonSync(ocPackagePath);

  return ocInfo.version;
};

module.exports = function(opts){
  opts = opts || {};

  var requestsOptions = {
    headers: {
      'user-agent': format('oc-cli-{0}/{1}-{2}-{3}', 
                            getOcVersion(),
                            process.version,
                            process.platform,
                            process.arch)
    }
  };

  return _.extend(this, {
    add: function(registry, callback){

      if(registry.slice(registry.length - 1) !== '/'){
        registry += '/';
      }

      request(registry, requestsOptions, function(err, res){
        if(err || !res){
          return callback('oc registry not available', null);
        }

        try {
          var apiResponse = JSON.parse(res);
          if(apiResponse.type !== 'oc-registry'){
            return callback('not a valid oc registry', null);
          }
        } catch(e){
          return callback('not a valid oc registry', null);
        }

        fs.readJson(settings.configFile.src, function(err, res){
          if(err){
            res = {};
          }

          if(!res.registries){
            res.registries = [];
          }

          if(!_.contains(res.registries, registry)){
            res.registries.push(registry);
          }

          fs.writeJson(settings.configFile.src, res, callback);
        });
      });
    },
    get: function(callback){
      if(opts.registry){
          return callback(null, [opts.registry]);
      }

      fs.readJson(settings.configFile.src, function(err, res){
        if(err || !res.registries || res.registries.length === 0){
          return callback('No oc registries');
        }

        return callback(null, res.registries);
      });
    },
    getApiComponentByHref: function(href, callback){
      request(href + settings.registry.componentInfoPath, requestsOptions, function(err, res){

        if(err){
          return callback(err, null);
        }

        callback(err, JSON.parse(res));
      });
    },
    getComponentPreviewUrlByUrl: function(componentHref, callback){
      request(componentHref, requestsOptions, function(err, res){
        if(err){ return callback(err); }

        var parsed = urlParser.parse(JSON.parse(res)),
            previewUrl = urlBuilder.componentPreview(parsed, parsed.registryUrl);

        callback(null, previewUrl);
      });  
    },
    getRegistryComponentsByRegistry: function(registry, callback){

      request(registry, requestsOptions, function(err, res){
        if(err || !res){
          return callback('not components found for registry: ' + registry, null);
        }

        var components;

        try {
          components = JSON.parse(res).components;
        } catch(e){
          return callback('Registry api responded in an unexpected way', null);
        }

        if(components.length === 0){
          return callback('no components found in oc registry', null);
        }

        async.map(components, function(component, cb){
          request(component + settings.registry.componentInfoPath, requestsOptions, function(err, res){
            cb(err, _.extend(JSON.parse(res), {
              href: component
            }));
          });
        }, callback);
      });
    },
    putComponent: function(options, callback){
      var headers = requestsOptions.headers;

      if(!!options.username && !!options.password){
        headers = _.extend(headers, { 'Authorization': 'Basic ' + new Buffer(options.username + ':' + options.password).toString('base64') });
      }

      put(options.route, options.path, headers, function(err, res){

        if(!!err){
          if(!_.isObject(err)){
            try {
              err = JSON.parse(err);
            } catch(er){
            }
          }

          if(!!err.code && err.code === 'ECONNREFUSED'){
            err = 'Connection to registry has not been established';
          } else if(!!err.code && err.code !== 'cli_version_not_valid' && !!err.error){
            err = err.error;
          }

          return callback(err);
        }

        callback(err, res);
      });
    },
    remove: function(registry, callback){
      fs.readJson(settings.configFile.src, function(err, res){
        if(err){
          res = {};
        }

        if(!res.registries){
          res.registries = [];
        }

        res.registries = _.without(res.registries, registry);
        fs.writeJson(settings.configFile.src, res, callback);
      });
    }
  });
};
