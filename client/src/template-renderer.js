'use strict';

var handlebars = require('oc-template-handlebars');
var htmlRenderer = require('./html-renderer');
var Jade = require('./renderers/jade');
var validator = require('./validator');

module.exports = function(){
  var renderers = {
    handlebars,
    jade: new Jade()
  };

  return function(template, model, options, callback){
    renderers[options.templateType].render(
      {
        template,
        model,
        templateType: options.templateType
      },
      function(err, html){
        options.html = html;
        return callback(err, htmlRenderer.renderedComponent(options));
      }
    );
  };
};
