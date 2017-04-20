'use strict';

const _ = require('lodash');

module.exports = function(input){
  const response = {
    isValid: true
  };

  const returnError = function(message){
    response.isValid = false;
    response.message = message || 'uploaded package is not valid';
    return response;
  };

  if(!input || !_.isObject(input) || _.keys(input).length === 0){
    return returnError('empty');
  }

  if(_.keys(input).length !== 1){
    return returnError('not_valid');
  }

  const file = input[_.keys(input)[0]];

  if(file.mimetype !== 'application/octet-stream' || !!file.truncated || file.extension !== 'gz' || file.path.indexOf('.tar.gz') < 0){
    return returnError('not_valid');
  }

  return response;
};