'use strict';

var padZero = require('./pad-zero');

module.exports = function(date){
  if(date instanceof Date) {
    return date.getFullYear() + '/' + padZero(2, date.getMonth() + 1) + '/' + padZero(2, date.getDate()) +
      ' ' + padZero(2, date.getHours()) + ':' + padZero(2, date.getMinutes()) + ':' + padZero(2, date.getSeconds());
  }
  
  return '';
};
