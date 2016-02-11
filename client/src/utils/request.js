'use strict';

var url = require('url');
var zlib = require('zlib');

var _ = require('./helpers');

module.exports = function(options, callback){

  var callbackDone = false,
      httpProtocol = options.url.indexOf('https') === 0 ? 'https' : 'http',
      requestData = url.parse(options.url),
      method = options.method || 'get',
      isJson = options.json || false,
      headers = options.headers || {},
      isPost = method === 'post',
      postBody = isPost ? JSON.stringify(options.body) : null,
      contentLength = !!postBody ? Buffer.byteLength(postBody) : null,
      timeout = options.timeout || 5,
      setHeader = function(k, v){ requestData.headers[k] = v; };

  var respond = function(statusCode, body){
    body = body.toString('utf-8');
    if(statusCode >= 400){
      callback(statusCode);
    } else if(isJson){ 
      try {
        callback(null, JSON.parse(body));
      } catch(e){
        return callback('error while parsing json response');
      }
    } else {
      callback(null, body);
    }
  };

  requestData.headers = {};
  requestData.method = method;

  _.each(headers, function(header, headerName){
    setHeader(headerName, header);
  });

  setHeader('accept-encoding', 'gzip');

  if(isPost){
    setHeader('content-length', contentLength);
    setHeader('content-type', 'application/json');
  }
  
  var timer = setTimeout(function() {
    if(!callbackDone){
      callbackDone = true;
      return callback('timeout');
    }
  }, 1000 * timeout);

  var req = require(httpProtocol).request(requestData).on('response', function(response) {
    
    var body = [];

    response.on('data', function(chunk){
      body.push(chunk);
    }).on('end', function(){
      body = Buffer.concat(body);
      if(!callbackDone){
        clearTimeout(timer);
        callbackDone = true;

        if(response.headers['content-encoding'] === 'gzip'){
          zlib.gunzip(body, function(err, dezipped) {
            if(!!err){ return callback(err); }
            respond(response.statusCode, dezipped);
          });
        } else {
          respond(response.statusCode, body);
        }
      }
    });
  }).on('error', function(e){
    if(!callbackDone){
      clearTimeout(timer);
      callbackDone = true;
      callback(e);
    }
  });

  if(isPost){
    req.write(postBody);
  }

  req.end();
};