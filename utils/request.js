'use strict';

var url = require('url');
var _ = require('underscore');

module.exports = function(urlPath, options, callback){

  var httpProtocol = urlPath.indexOf('https') === 0 ? 'https' : 'http',
      callbackDone = false; 

  if(_.isFunction(options)){
    callback = options;
    options = {};
  }

  options = _.extend(url.parse(urlPath), options);

  require(httpProtocol).get(options).on('response', function(response) {

    var body = '';

    response.on('data', function(chunk){
      body += chunk;
    });

    response.on('end', function(){
      if(!callbackDone){
        callbackDone = true;

        if(response.statusCode === 404){
          callback('not found', null);
        } else {
          callback(null, body);
        }
      }
    });
  }).on('error', function(e){
    if(!callbackDone){
      callbackDone = true;
      callback(e, null);
    }
  });
};