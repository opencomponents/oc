'use strict';

var _ = require('underscore');

var urlBuilder = require('../domain/url-builder');
var getComponentInfoFallback = require('./helpers/get-component-fallback').componentInfo;

module.exports = function(conf, repository){
  return function(req, res){
    
    repository.getComponent(req.params.componentName, req.params.componentVersion, function(err, component){

      if(err){
        if(conf.fallbackRegistryUrl) {
          return getComponentInfoFallback(conf.fallbackRegistryUrl, req.originalUrl, req.headers, function(fallbackErr, fallbackResponse) {
            if(fallbackErr === 304) {
              return res.status(304).send('');
            }

            if(fallbackErr) {
              res.errorDetails = err;
              res.errorCode = 'NOT_FOUND';
              return res.status(404).json({ err: err, fallbackErr: fallbackErr});
            }

            return res.send(fallbackResponse);
          });
        }

        res.errorDetails = err;
        res.errorCode = 'NOT_FOUND';
        return res.status(404).json({ err: err });
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
        res.status(200).json(_.extend(component, {
          requestVersion: req.params.componentVersion || ''
        }));
      }
    });
  };
};