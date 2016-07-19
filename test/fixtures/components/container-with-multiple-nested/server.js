'use strict';

module.exports.data = function(context, callback){
  context.renderComponents([{
  	name: 'welcome',
  	parameters: { firstName: 'Jane' }
  },{
  	name: 'welcome',
  	parameters: { firstName: 'John' }
  }], {
  	parameters: { lastName: 'Doe' }
  }, function(err, components){
    callback(err, { nested: components });
  });
};