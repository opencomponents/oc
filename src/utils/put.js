'use strict';

const FormData = require('form-data');
const fs = require('fs-extra');
const path = require('path');
const url = require('url');
const _ = require('lodash');

module.exports = function(urlPath, files, headers, callback) {
  if (_.isFunction(headers)) {
    callback = headers;
    headers = {};
  }

  const form = new FormData(),
    options = _.extend(url.parse(urlPath), { method: 'PUT' });
  let body = '',
    callbackDone = false;

  if (!_.isArray(files)) {
    files = [files];
  }

  _.forEach(files, file => {
    const fileName = path.basename(file);
    form.append(fileName, fs.createReadStream(file));
  });

  options.headers = _.extend(headers, form.getHeaders());

  form.submit(options, (err, res) => {
    if (err) {
      callbackDone = true;
      return callback(err);
    }

    res.on('data', chunk => {
      body += chunk;
    });

    res.on('end', () => {
      if (!callbackDone) {
        callbackDone = true;

        if (res.statusCode !== 200) {
          callback(body);
        } else {
          callback(null, body);
        }
      }
    });
  });
};
