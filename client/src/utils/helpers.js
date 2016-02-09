'use strict';

var _ = {
  each: function(obj, fn){
    if(_.isArray(obj)){
      for(var i = 0; i < obj.length; i++){
        fn(obj[i], i, obj);
      }
    } else {
      for(var el in obj){
        if(_.has(obj, el)){
          fn(obj[el], el, obj);
        }
      }
    }
  },
  eachAsync: function(obj, fn, cb){
    var c = obj.length;
    
    var next = function(){
      c--;
      if(c === 0){ 
        var a = cb;
        cb = _.noop;
        return a();
      }
    };

    _.each(obj, function(el){
      fn(el, next);
    });
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
  noop: function(){
    return function(){};
  },
  toArray: function(input){
    if(!!input && typeof(input) === 'string'){
      input = [input];
    }

    return input;
  }
};

module.exports = _;