'use strict';

var Handlebars = require('./renderers/handlebars');
var htmlRenderer = require('./html-renderer');
var Jade = require('./renderers/jade');

module.exports = function(){
  
  var renderers = {
    handlebars: new Handlebars(),
    jade: new Jade()
  };

  return function(template, data, options, callback){
    renderers[options.templateType].render(template, data, function(err, html){
      options.html = html;
      return callback(err, htmlRenderer.renderedComponent(options));
    });
  };
};