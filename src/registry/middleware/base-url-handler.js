'use strict';

var _ = require('underscore');

module.exports = function(req, res, next){

  res.conf.baseUrlFunc = res.conf.baseUrlFunc || (_.isFunction(res.conf.baseUrl) ? res.conf.baseUrl : undefined);

  if(!_.isUndefined(res.conf.baseUrlFunc)){
    res.conf.baseUrl = res.conf.baseUrlFunc({
      host: req.headers.host,
      secure: req.secure
    });
  }

  next();
};