'use strict';

var FormData = require('form-data');
var fs = require('fs-extra');
var path = require('path');
var url = require('url');
var _ = require('underscore');

module.exports = function(urlPath, files, callback) {

  var form = new FormData(),
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

  form.submit(options, function(err, res){

    if(!!err){
      callbackDone = true;
      return callback(err);
    }

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
  });
};