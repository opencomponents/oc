'use strict';

var handlebars = require('handlebars');
var handlebars3 = require('handlebars3');

module.exports = function(){

  this.render = function(template, model, callback){
    
    /*  
      The following code is required for rendering components
      published with both Handlerbars V3 and V4. This polyfill
      will be removed and kept only to allow OC mantainers to
      gracefully migrate to the new version (supporting only v4). 
    */

    var needs3 = template.compiler[0] < 7,
        compiler = needs3 ? handlebars3 : handlebars,
        linked = compiler.template(template),
        html = linked(model);

    callback(null, html);
  };
};
