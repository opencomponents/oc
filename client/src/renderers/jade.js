'use strict';

module.exports = function(){
  this.render = function(options, callback){
    return callback(null, options.template(options.model).toString());
  };
};
