'use strict';

var _ = require('underscore');

var urlBuilder = require('../domain/url-builder');

module.exports = function(repository){
  return function(req, res){

    repository.getComponent(req.params.componentName, req.params.componentVersion, function(err, component){

      if(err){
        res.errorDetails = err;
        return res.json(404, { err: err });
      }

      var isHtmlRequest = !!req.headers.accept && req.headers.accept.indexOf('text/html') >= 0;

      if(isHtmlRequest && !!res.conf.discovery){

        var params = {};
        if(!!component.oc.parameters){
          var mandatoryParams = _.filter(_.keys(component.oc.parameters), function(paramName){
            var param = component.oc.parameters[paramName];
            return !!param.mandatory && !!param.example;
          });

          params = _.mapObject(_.pick(component.oc.parameters, mandatoryParams), function(param){
            return param.example;
          });
        }

        component.getRepositoryUrl = function() {
          if (typeof this.repository === 'object') {
            if (this.repository.url)
              return this.repository.url;
          }
          if (typeof this.repository === 'string')
            return this.repository;
          return null;
        }

        return res.render('component-info', {
          component: component,
          dependencies: _.keys(component.dependencies),
          href: res.conf.baseUrl,
          sandBoxDefaultQs: urlBuilder.queryString(params)
        });

      } else {
        res.json(200, _.extend(component, {
          requestVersion: req.params.componentVersion || ''
        }));
      }
    });
  };
};