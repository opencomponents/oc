'use strict';

var format = require('stringformat');
var request = require('minimal-request');

var settings = require('./settings');
var TryGetCached = require('./try-get-cached');
var requireTemplate = require('./utils/require-template');

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

        var type = template.type;
        if (type === 'jade') { type = 'oc-template-jade'; }
        if (type === 'handlebars') { type = 'oc-template-handlebars'; }

        var ocTemplate = requireTemplate(type); 
        cb(null, ocTemplate.getCompiledTemplate(templateText, template.key));
       });
    };

    if(!!useCache){
      return tryGetCached('template', template.key, getTemplateFromS3, callback);
    }

    return getTemplateFromS3(callback);
  };
};


