'use strict';
const request = require('request');

module.exports.data = function(context, callback){
  request({
    uri: 'https://api.github.com/users/' + context.params.username + '/repos',
    json: true,
    headers: {
      'User-Agent': 'oc-example'
    }
  }, (err, res, body) => {
    if(err){
      return callback(err);
    }

    callback(null, {
      username: context.params.username,
      repos: body.sort((a, b) => a['stargazers_count'] - b['stargazers_count'])
    });
  });
};
