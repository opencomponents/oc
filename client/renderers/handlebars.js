'use strict';

var format = require('../../utils/format');
var handlebars = require('handlebars');

module.exports = function(){

  this.render = function(template, model, callback){
    var linked = handlebars.template(template),
        html = linked(model);

    callback(null, html);
  };

  this.getUnrenderedComponent = function(href){
    return format('<oc-component href="{0}"></oc-component>', href);
  };

  this.getRenderedComponent = function(data){
    var random = Math.floor(Math.random()*9999999999);

    return format('<oc-component href="{0}" data-hash="{1}" id="{2}" data-rendered="true" data-version="{3}">{4}</oc-component>', 
                  data.href, data.key, random, data.version, data.html);
  };
};
