'use strict';

var url = require('url');

module.exports = function(urlPath, headers, timeout, callback){

  var callbackDone = false,
      httpProtocol = urlPath.indexOf('https') === 0 ? 'https' : 'http',
      requestData = url.parse(urlPath);

  if(typeof(headers) === 'function'){
    callback = headers;
    headers = {};
  }

  for(var header in headers){
    if(headers.hasOwnProperty(header)){
      if(!requestData.headers){
        requestData.headers = {};
      }

      requestData.headers[header] = headers[header];
    }
  }
  
  var timer = setTimeout(function() {
    if(!callbackDone){
      callbackDone = true;
      return callback('timeout');
    }
  }, 1000 * timeout);

  require(httpProtocol).get(requestData).on('response', function(response) {

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