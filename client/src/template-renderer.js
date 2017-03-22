'use strict';

var handlebars = require('oc-template-handlebars');
var htmlRenderer = require('./html-renderer');
var jade = require('oc-template-jade');
var validator = require('./validator');

module.exports = function(){
  var templateEngines = {
    'oc-template-handlebars': handlebars,
    'oc-template-jade': jade
  };

  return function(template, model, options, callback){
    var type = options.templateType;
    if (type === 'jade') { type = 'oc-template-jade'; }
    if (type === 'handlebars') { type = 'oc-template-handlebars'; }
    
    templateEngines[type].render(
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
