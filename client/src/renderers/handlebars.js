'use strict';

var handlebars = require('handlebars');
var handlebars3 = require('handlebars3');

module.exports = function(){

  this.render = function(template, model, callback){
    var needs3 = template.compiler[0] < 7,
        compiler = needs3 ? handlebars3 : handlebars,
        linked = compiler.template(template),
        html = linked(model);

    callback(null, html);
  };
};
