'use strict';

module.exports = {
  each: function(obj, fn){
    for(var el in obj){
      if(obj.hasOwnProperty(el)){
        fn(el);
      }
    }
  },
  has: function(obj, key){
    return !!obj && obj.hasOwnProperty(key);
  },
  isArray: function(input){
    return Object.prototype.toString.call(input) === '[object Array]';
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