'use strict';

const _ = require('lodash');

module.exports = function(req, res, next) {
  res.conf.discoveryFunc =
    res.conf.discoveryFunc ||
    (_.isFunction(res.conf.discovery) ? res.conf.discovery : undefined);

  if (!_.isUndefined(res.conf.discoveryFunc)) {
    res.conf.discovery = res.conf.discoveryFunc({
      host: req.headers.host,
      secure: req.secure
    });
  }

  next();
};
