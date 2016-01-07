'use strict';

var async = require('async');

var GetComponentHelper = require('./helpers/get-component');

module.exports = function(conf, repository){

  var getComponent = new GetComponentHelper(conf, repository);

  return function(req, res){

    if(!req.body.components){
      return res.json(400, {
        code: 'POST_BODY_NOT_VALID',
        error: 'The request body is malformed'      
      });
    }

    async.map(req.body.components, function(component, callback){
      getComponent({
        conf: res.conf,
        headers: req.headers,
        name: component.name,
        parameters: component.parameters,
        version: component.version
      }, function(result){
        callback(null, result.response);
      });
    }, function(err, results){
      return res.json(200, results);
    });
  };
};
