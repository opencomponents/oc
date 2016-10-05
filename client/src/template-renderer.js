'use strict';

var Handlebars = require('./renderers/handlebars');
var htmlRenderer = require('./html-renderer');
var Jade = require('./renderers/jade');
var Pug = require('./renderers/pug');
var validator = require('./validator');

module.exports = function(){
  
  var renderers = {
    handlebars: new Handlebars(),
    jade: new Jade(),
    pug: new Pug()
  };

  return function(template, data, options, callback){

    var validationResult = validator.validateComponent(template, options);

    if(!validationResult.isValid){
      return callback(validationResult.error);
    }

    renderers[options.templateType].render(template, data, function(err, html){
      options.html = html;
      return callback(err, htmlRenderer.renderedComponent(options));
    });
  };
};