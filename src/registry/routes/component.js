'use strict';

var GetComponentHelper = require('./helpers/get-component');
var _ = require('underscore');

module.exports = function(conf, repository){

  var getComponent = new GetComponentHelper(conf, repository);

  var setCustomHeaders = function(req, res, componentResponse) {
    if (req.params.componentVersion === componentResponse.version) {
      //strong version request
      res.set(componentResponse.headers);
    } else {
      //weak version request, therefore skip the blacklisted headers if any
      if (_.isEmpty(res.conf.customHeadersToSkipOnWeakVersion || [])) {
          res.set(componentResponse.headers);
      } else {
        var headersToSkip = new Set(res.conf.customHeadersToSkipOnWeakVersion);

        _.forEach(Object.keys(componentResponse.headers), function(header) {
          if (!headersToSkip.has(header.toLowerCase())) {
            res.set(header, componentResponse.headers[header]);
          }
        });
      }
    }
  };

  return function(req, res){
    getComponent({
      conf: res.conf,
      headers: req.headers,
      name: req.params.componentName,
      parameters: req.query,
      version: req.params.componentVersion
    }, function(result){
      if(!!result.response.error){
        res.errorCode = result.response.code;
        res.errorDetails = result.response.error;
      }

      if (result.response.headers) {
        setCustomHeaders(req, res, result.response);
      }

      return res.json(result.status, result.response);
    });
  };
};
