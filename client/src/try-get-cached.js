'use strict';

module.exports = function(cache){
  return function(type, key, predicate, callback){
    var cached = cache.get(type, key);

    if(!!cached){
      return callback(null, cached);
    }

    predicate(function(err, res){
      if(!!err){ return callback(err); }

      cache.set(type, key, res);
      callback(err, res);
    });
  };
};