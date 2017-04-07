'use strict';

var htmlRenderer = require('./html-renderer');
var requireTemplate = require('./utils/require-template');

module.exports = function(){
  return function(template, model, options, callback){

    var type = options.templateType;
    if (type === 'jade') { type = 'oc-template-jade'; }
    if (type === 'handlebars') { type = 'oc-template-handlebars'; }

    var ocTemplate;
    try {
      ocTemplate = requireTemplate(type); 
    } catch (err) {
      return callback(err);
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
