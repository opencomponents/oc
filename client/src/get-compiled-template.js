'use strict';

var format = require('stringformat');
var handlebars = require('oc-template-handlebars');
var jade = require('oc-template-jade');
var request = require('minimal-request');

var settings = require('./settings');
var TryGetCached = require('./try-get-cached');

module.exports = function(cache){

  var templateEngines = {
    'oc-template-handlebars': handlebars,
    'oc-template-jade': jade
  };

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
        var type = template.type;
        if (type === 'jade') { type = 'oc-template-jade'; }
        if (type === 'handlebars') { type = 'oc-template-handlebars'; }

        cb(null, templateEngines[type].getCompiledTemplate(templateText, template.key));
       });
    };

    if(!!useCache){
      return tryGetCached('template', template.key, getTemplateFromS3, callback);
    }

    return getTemplateFromS3(callback);
  };
};
