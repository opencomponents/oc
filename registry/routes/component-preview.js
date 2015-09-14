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

        
                
        return res.render('component-preview', {
          component: component,
          dependencies: _.keys(component.dependencies),
          href: res.conf.baseUrl,
          qs: urlBuilder.queryString(req.query)
        });

      } else {
        res.json(200, _.extend(component, {
          requestVersion: req.params.componentVersion || ''
        }));
      }
    });
  };
};