'use strict';

const format = require('stringformat');
const request = require('minimal-request');

const settings = require('./settings');
const TryGetCached = require('./try-get-cached');
const requireTemplate = require('./utils/require-template');

module.exports = function(cache){
  const tryGetCached = new TryGetCached(cache);

  return function(template, useCache, timeout, callback){
    const getTemplateFromS3 = function(cb){
      request({
        url: template.src,
        timeout: timeout
      }, (err, templateText) => {
        if(err){
          return cb({
            status: err,
            response: {
              error: format(settings.connectionError, template.src, templateText)
            }
          });
        }

        let type = template.type;
        if (type === 'jade') { type = 'oc-template-jade'; }
        if (type === 'handlebars') { type = 'oc-template-handlebars'; }

        let ocTemplate;
        try {
          ocTemplate = requireTemplate(type);
        } catch (err) {
          return callback(err);
        }

        cb(null, ocTemplate.getCompiledTemplate(templateText, template.key));
      });
    };

    if(useCache){
      return tryGetCached('template', template.key, getTemplateFromS3, callback);
    }

    return getTemplateFromS3(callback);
  };
};


