'use strict';

var logs =[];

module.exports = {
  get: function(){
    return logs;
  },
  log: function(message){
    logs.push(message);
    return message;
  },
  logNoNewLine: function(message){
    logs.push(message);
    return message;
  },
  reset: function(){
    logs = [];
  }
};