'use strict';

module.exports = function(req, res, next) {
  res.removeHeader('X-Powered-By');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  );
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS, PUT, POST');
  next();
};
