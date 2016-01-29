'use strict';

var handlebars = require('handlebars');

module.exports = function(){

  this.render = function(template, model, callback){
    var linked = handlebars.template(template),
        html = linked(model);

    callback(null, html);
  };
};
