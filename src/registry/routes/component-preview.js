'use strict';

var _ = require('underscore');

var urlBuilder = require('../domain/url-builder');
var getComponentInfoFallback = require('./helpers/get-component-fallback').componentInfo;

function addErrorDetails(res, err) {
  res.errorDetails = err;
  res.errorCode = 'NOT_FOUND';
}

function handleError(conf, req, res, err, component, callback) {
  if(!err) return callback(null, component);

  if(conf.fallbackRegistryUrl) {
    return getComponentInfoFallback(conf.fallbackRegistryUrl, req.originalUrl, req.headers, function(fallbackErr, fallbackResponse) {
      if(fallbackErr === 304) {
        return res.status(304).send('');
      }

      if(fallbackErr) {
        addErrorDetails(res, err);
        return res.status(404).json({ err: err, fallbackErr: fallbackErr});
      }

      try{
        return callback(null, JSON.parse(fallbackResponse));
      } catch (parseError) {
        addErrorDetails(res, err);
        return res.status(404).json({ err: err, fallbackErr: 'Could not parse fallback response: ' + fallbackResponse});
      }
    });
  }

  addErrorDetails(res, err);
  return res.status(404).json({ err: err });
}

module.exports = function(conf, repository){
  return function(req, res){
    
    repository.getComponent(req.params.componentName, req.params.componentVersion, function(err, localComponent){

      handleError(conf, req, res, err, localComponent, function(__, component) {
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