'use strict';

module.exports.data = function(req, callback){
  callback(null, { staticPath: req.staticPath });
};