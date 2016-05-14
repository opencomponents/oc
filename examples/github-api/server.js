'use strict';
var request = require('request');

module.exports.data = function(context, callback){
  request({
    uri: 'https://api.github.com/users/' + context.params.username + '/repos',
    json: true,
    headers: {
      'User-Agent': 'oc-example'
    }
  }, function(err, res, body){
    if(err){
      return callback(err);
    }

    callback(null, {
      username: context.params.username,
      repos: body.sort(function(a, b){
        return a['stargazers_count'] - b['stargazers_count'];
      })
    });
  });
};
