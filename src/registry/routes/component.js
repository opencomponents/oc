'use strict';

const GetComponentHelper = require('./helpers/get-component');
const _ = require('underscore');

module.exports = function(conf, repository){

  const getComponent = new GetComponentHelper(conf, repository);

  return function(req, res){
    getComponent({
      conf: res.conf,
      headers: req.headers,
      name: req.params.componentName,
      parameters: req.query,
      version: req.params.componentVersion
    }, function(result){
      if(result.response.error){
        res.errorCode = result.response.code;
        res.errorDetails = result.response.error;
      }

      if (!_.isEmpty(result.headers)) {
        res.set(result.headers);
      }

      return res.status(result.status).json(result.response);
    });
  };
};
