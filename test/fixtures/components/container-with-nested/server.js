'use strict';

module.exports.data = function(context, callback){
  context.renderComponent('no-containers', function(err, html){
    callback(err, { nested: html });
  });
};