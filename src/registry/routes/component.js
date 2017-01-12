'use strict';

var GetComponentHelper = require('./helpers/get-component');
var _ = require('underscore');

module.exports = function(conf, repository){

  var getComponent = new GetComponentHelper(conf, repository);

  var setCustomHeaders = function(req, res, componentResponse) {
    var headersToSet = componentResponse.headers;

    if (req.params.componentVersion !== componentResponse.version && 
        !_.isEmpty(res.conf.customHeadersToSkipOnWeakVersion)) 
    {
      headersToSet = _.omit(headersToSet, res.conf.customHeadersToSkipOnWeakVersion);
    }
    
    if (!_.isEmpty(headersToSet)) {
      res.set(headersToSet);
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
