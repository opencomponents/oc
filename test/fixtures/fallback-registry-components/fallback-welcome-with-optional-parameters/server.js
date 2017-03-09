'use strict';

module.exports.data = function(context, callback){
  callback(null, {
    firstName: context.params.firstName,
    lastName: context.params.lastName,
    nick: context.params.nick
  });
};