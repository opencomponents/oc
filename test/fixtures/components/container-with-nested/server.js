'use strict';

module.exports.data = function(context, callback){
  context.renderComponent('welcome', {
    container: false,
    parameters: {
      firstName: 'Mickey',
      lastName: 'Mouse'
    }
  }, function(err, html){
    callback(err, { nested: html });
  });
};