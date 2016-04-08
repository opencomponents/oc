'use strict';

var async = require('async');
var format = require('stringformat');
var _ = require('underscore');

var GetComponentHelper = require('./helpers/get-component');
var strings = require('../../resources');

module.exports = function(conf, repository){

  var getComponent = new GetComponentHelper(conf, repository);

  return function(req, res){

    var components = req.body.components,
        registryErrors = strings.errors.registry;

    var returnError = function(message){
      return res.json(400, {
        code: registryErrors.BATCH_ROUTE_BODY_NOT_VALID_CODE,
        error: format(registryErrors.BATCH_ROUTE_BODY_NOT_VALID, message)
      });
    };

    if(!components){
      return returnError(registryErrors.BATCH_ROUTE_COMPONENTS_PROPERTY_MISSING);
    } else if(!_.isArray(components)){
      return returnError(registryErrors.BATCH_ROUTE_COMPONENTS_NOT_ARRAY);
    }

    if(!_.isEmpty(components)){
      var errors = _.compact(_.map(components, function(component, index){
        if(!component.name){
          return format(registryErrors.BATCH_ROUTE_COMPONENT_NAME_MISSING, index);
        }
      }));

      if(!_.isEmpty(errors)){
        return returnError(errors.join(', '));
      }
    }

    async.map(components, function(component, callback){
      getComponent(_.extend(component, {
        conf: res.conf,
        headers: req.headers,
        omitHref: !!req.body.omitHref,
        parameters: _.extend(_.clone(req.body.parameters) || {}, component.parameters || {})
      }), function(result){
        callback(null, result);
      });
    }, function(err, results){
      return res.json(200, results);
    });
  };
};
