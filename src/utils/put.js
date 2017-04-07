'use strict';

const FormData = require('form-data');
const fs = require('fs-extra');
const path = require('path');
const url = require('url');
const _ = require('underscore');

module.exports = function(urlPath, files, headers, callback) {

  if(_.isFunction(headers)){
    callback = headers;
    headers = {};
  }

  let form = new FormData(),
      body = '',
      callbackDone = false,
      options = _.extend(url.parse(urlPath), { method: 'PUT' });

  if(!_.isArray(files)){
    files = [files];
  }

  _.forEach(files, function(file){
    const fileName = path.basename(file);
    form.append(fileName, fs.createReadStream(file));
  });

  options.headers = _.extend(headers, form.getHeaders());

  form.submit(options, function(err, res){

    if(err){
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