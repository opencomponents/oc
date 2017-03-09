'use strict';

var format = require('stringformat');
var request = require('minimal-request');

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
        try {
          // Support for old component.type convention (jade & handlebars only)
          var type = template.type;
          if (type === 'jade') type = 'oc-template-jade';
          if (type === 'handlebars') type = 'oc-template-handlebars';

          // dynamically require oc-templates
          var ocTemplate = require(type);
        } catch (err) {
          throw format(settings.templateNotSupported, type);
        }
        cb(null, templateEngines[template.type].getCompiledTemplate(templateText, template.key));
       });
    };

    if(!!useCache){
      return tryGetCached('template', template.key, getTemplateFromS3, callback);
    }

    return getTemplateFromS3(callback);
  };
};
