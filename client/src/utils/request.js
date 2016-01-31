'use strict';

var url = require('url');
var _ = require('./helpers');

module.exports = function(options, callback){

  var callbackDone = false,
      httpProtocol = options.url.indexOf('https') === 0 ? 'https' : 'http',
      requestData = url.parse(options.url),
      method = options.method || 'get',
      headers = options.headers || {};

  requestData.headers = {};

  _.each(headers, function(header){
    requestData.headers[header] = headers[header];
  });
  
  var timer = setTimeout(function() {
    if(!callbackDone){
      callbackDone = true;
      return callback('timeout');
    }
  }, 1000 * options.timeout);

  require(httpProtocol)[method](requestData).on('response', function(response) {

    if(!callbackDone){
      clearTimeout(timer);
      
      var body = '';

      response.on('data', function(chunk){
        body += chunk;
      });

      response.on('end', function(){
        if(!callbackDone){
          callbackDone = true;

          if(response.statusCode >= 400){
            callback(response.statusCode);
          } else { 
            callback(null, body);
          }
        }
      });
    }
  }).on('error', function(e){
    if(!callbackDone){
      callbackDone = true;
      callback(e);
    }
  });
};