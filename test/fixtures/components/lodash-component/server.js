'use strict';

var _ = require('lodash');

module.exports.data = function(context, callback){
  callback(null, {
  	magicNumber: _.first([5, 4])
  });
};
