'use strict';

var GetComponentHelper = require('./helpers/get-component');
var Settings = require('../../resources/settings');

module.exports = function(conf, repository){

  var getComponent = new GetComponentHelper(conf, repository);

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
        res.set(result.response.headers);
      }

      return res.json(result.status, result.response);
    });
  };
};
