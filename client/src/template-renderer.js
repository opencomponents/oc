'use strict';

var htmlRenderer = require('./html-renderer');
var format = require('stringformat');
var settings = require('./settings');

module.exports = function () {

  return function (template, model, options, callback) {
    try {
      // Support for old component.type convention (jade & handlebars only)
      var type = options.templateType;
      if (type === 'jade') type = 'oc-template-jade';
      if (type === 'handlebars') type = 'oc-template-handlebars';

      // dynamically require oc-templates
      var ocTemplate = require(type);
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
