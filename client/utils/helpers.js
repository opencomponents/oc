'use strict';

module.exports = {
  has: function(obj, key){
    return !!obj && obj.hasOwnProperty(key);
  },
  isEmpty: function(input){
    return !input || input.length === 0;
  },
  isFunction: function(input){
    return typeof(input) === 'function';
  },
  toArray: function(input){
    if(!!input && typeof(input) === 'string'){
      input = [input];
    }

    return input;
  }
};