'use strict';

var FormData = require('form-data');
var fs = require('fs-extra');
var path = require('path');
var url = require('url');
var _ = require('underscore');

module.exports = function(urlPath, files, callback) {

  var form = new FormData(),
      httpProtocol = urlPath.indexOf('https') === 0 ? 'https' : 'http',
      body = '',
      callbackDone = false,
      options = _.extend(url.parse(urlPath), {
        method: 'PUT'
      });

  if(!_.isArray(files)){
    files = [files];
  }

  _.forEach(files, function(file){
    var fileName = path.basename(file);
    form.append(fileName, fs.createReadStream(file));
  });

  options.headers = form.getHeaders();

  var req = require(httpProtocol).request(options);

  form.pipe(req);

  req.on('response', function(res){

    res.on('data', function(chunk){
      body += chunk;
    });

    res.on('end', function(){
      if(!callbackDone){
        callbackDone = true;

        if(res.statusCode !== 200){
          callback(body);
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