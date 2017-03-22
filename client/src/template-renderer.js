'use strict';

var htmlRenderer = require('./html-renderer');
var validator = require('./validator');
var format = require('stringformat');
var settings = require('./settings');

module.exports = function(){
  return function(template, model, options, callback){

    var type = options.templateType;
    var ocTemplate;
    try {
      if (type === 'jade') { type = 'oc-template-jade'; }
      if (type === 'handlebars') { type = 'oc-template-handlebars'; }

      // dynamically require specific oc-template
      ocTemplate = require(type);
    } catch (err) {
      throw format(settings.templateNotSupported, type);
    }
    
    ocTemplate.render(
      {
        template,
        model
      },
      function(err, html){
        options.html = html;
        return callback(err, htmlRenderer.renderedComponent(options));
      }
    );
  };
};
