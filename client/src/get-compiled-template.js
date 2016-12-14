'use strict';

var format = require('stringformat');
var request = require('minimal-request');

var executor = require('./executor');
var settings = require('./settings');
var TryGetCached = require('./try-get-cached');

module.exports = function(cache){

  var tryGetCached = new TryGetCached(cache);
  
  return function(template, useCache, timeout, callback){

    var getTemplateFromS3 = function(cb){
      request({
        url: template.src,
        timeout: timeout
      }, function(err, templateText){
        if(!!err){
          return cb({
            status: err,
            response: {
              error: format(settings.connectionError, template.src, templateText)
            }
          });
        }

        cb(null, executor.template(templateText, template));
       });
    };

    if(!!useCache){
      return tryGetCached('template', template.key, getTemplateFromS3, callback);
    }

    return getTemplateFromS3(callback);
  };
};