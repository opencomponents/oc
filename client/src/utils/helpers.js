'use strict';

const _ = {
  each: function(obj, fn){
    if(_.isArray(obj)){
      for(let i = 0; i < obj.length; i++){
        fn(obj[i], i, obj);
      }
    } else {
      for(const el in obj){
        if(_.has(obj, el)){
          fn(obj[el], el, obj);
        }
      }
    }
  },
  eachAsync: function(obj, fn, cb){
    let callbacksLeft = obj.length;

    const next = function(err){
      callbacksLeft--;
      if(callbacksLeft === 0 || !!err){

        const cbCopy = cb;
        cb = _.noop;

        return cbCopy(err);
      }
    };

    _.each(obj, (el) => {
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
