'use strict';

module.exports.data = function(context, callback){
  callback(null, {
    name: context.params.name,
    age: context.params.age
  });
};
