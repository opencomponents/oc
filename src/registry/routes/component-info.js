'use strict';

var parseAuthor = require('parse-author');
var _ = require('underscore');

var urlBuilder = require('../domain/url-builder');
var getComponentInfoFallback = require('./helpers/get-component-fallback').componentInfo;

function handleError(conf, req, res, err, component, callback) {
  if(!err) return callback(null, component);

  if(conf.fallbackRegistryUrl) {
    return getComponentInfoFallback(conf.fallbackRegistryUrl, req.originalUrl, req.headers, function(fallbackErr, fallbackResponse) {
      if(fallbackErr === 304) {
        return res.status(304).send('');
      }

      if(fallbackErr) return res.status(404).json({ err: err, fallbackErr: fallbackErr});
      try{
        return callback(null, JSON.parse(fallbackResponse));
      } catch (parseError) {
        return res.status(404).json({ err: err, fallbackErr: 'Could not parse fallback response: ' + fallbackResponse});
      }
    });
  }

  res.errorDetails = err;
  return res.status(404).json({ err: err });
}

module.exports = function(conf, repository){
  return function(req, res){

    repository.getComponent(req.params.componentName, req.params.componentVersion, function(err, localComponent){

      handleError(conf, req, res, err, localComponent, function(__, component) {

        var isHtmlRequest = !!req.headers.accept && req.headers.accept.indexOf('text/html') >= 0;

        if(isHtmlRequest && !!res.conf.discovery){

          var params = {},
            author = component.author || {},
            parsedAuthor = _.isString(author) ? parseAuthor(author) : author;

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
            if (_.isObject(this.repository)) {
              if (this.repository.url) {
                return this.repository.url;
              }
            }
            if (_.isString(this.repository)) {
              return this.repository;
            }
            return null;
          };

          return res.render('component-info', {
            component: component,
            dependencies: _.keys(component.dependencies),
            href: res.conf.baseUrl,
            parsedAuthor: parsedAuthor,
            sandBoxDefaultQs: urlBuilder.queryString(params)
          });

        } else {
          res.status(200).json(_.extend(component, {
            requestVersion: req.params.componentVersion || ''
          }));
        }
      })

    });
  };
};