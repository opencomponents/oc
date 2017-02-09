'use strict';

var _ = require('underscore');

var urlBuilder = require('../domain/url-builder');
var handleGetComponentFromLocalRepositoryError = require('./helpers/get-component-fallback').handleGetComponentFromLocalRepositoryError;

module.exports = function(conf, repository){
  return function(req, res){
    
    repository.getComponent(req.params.componentName, req.params.componentVersion, function(err, localComponent){

      handleGetComponentFromLocalRepositoryError(conf, req, res, err, localComponent, function(__, component) {
        var isHtmlRequest = !!req.headers.accept && req.headers.accept.indexOf('text/html') >= 0;

        if(isHtmlRequest && !!res.conf.discovery){

          return res.render('component-preview', {
            component: component,
            dependencies: _.keys(component.dependencies),
            href: res.conf.baseUrl,
            qs: urlBuilder.queryString(req.query)
          });

        } else {
          res.status(200).json(_.extend(component, {
            requestVersion: req.params.componentVersion || ''
          }));
        }
      });

    });
  };
};