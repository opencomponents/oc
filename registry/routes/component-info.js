'use strict';

var _ = require('underscore');

module.exports = function(repository){
  return function(req, res){

    repository.getComponent(req.params.componentName, req.params.componentVersion, function(err, component){

      if(err){
        res.errorDetails = err;
        return res.json(404, { err: err });
      }

      res.json(200, _.extend(component, {
        requestVersion: req.params.componentVersion || ''
      }));
    });

  };
};