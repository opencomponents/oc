'use strict';

module.exports = function(){
  this.render = function(template, model, callback){
    return callback(null, template(model).toString());
  };
};
