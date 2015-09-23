'use strict';

var url = require('url');

module.exports = function(urlPath, headers, callback){

  var httpProtocol = urlPath.indexOf('https') === 0 ? 'https' : 'http',
      callbackDone = false,
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
  
  require(httpProtocol).get(requestData).on('response', function(response) {

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
  }).on('error', function(e){
    if(!callbackDone){
      callbackDone = true;
      callback(e);
    }
  });
};