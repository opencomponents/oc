'use strict';

var _ = require('underscore');

module.exports = function(req, res, next){

  var baseUrlFunc = _.isFunction(res.conf.baseUrl) ? res.conf.baseUrl : undefined;

  if(!_.isUndefined(baseUrlFunc)){
    res.conf.baseUrl = baseUrlFunc({
      host: req.headers.host,
      secure: req.secure
    });
  }

  next();
};