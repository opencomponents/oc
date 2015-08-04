'use strict';

var packageInfo = require('../../package.json');
var urlBuilder = require('../domain/url-builder');

var async = require('async');
var _ = require('underscore');

module.exports = function(repository){
  return function(req, res, next){

    repository.getComponents(function(err, components){
      if(err){
        res.errorDetails = 'cdn not available';
        return res.json(404, { error: res.errorDetails });
      }

      var isHtmlRequest = !!req.headers.accept && req.headers.accept.indexOf('text/html') >= 0;

      if(isHtmlRequest && !!res.conf.discovery){

        var componentsInfo = [];

        async.each(components, function(component, callback){
          return repository.getComponent(component, function (err, result) {
            if(err){ return callback(err); }

            componentsInfo.push(result);
            callback();
          });
        }, function(err){
          if(err){ return next(err); }

          return res.render('list-components', {
            href: res.conf.baseUrl,
            components: componentsInfo,
            type: res.conf.local ? 'oc-registry-local' : 'oc-registry',
            ocVersion: packageInfo.version
          });
        });
      } else {
        res.json(200, {
          href: res.conf.baseUrl,
          components: _.map(components, function(component){
            return urlBuilder.component(component, res.conf.baseUrl);
          }),
          type: res.conf.local ? 'oc-registry-local' : 'oc-registry',
          ocVersion: packageInfo.version
        });
      }
    });
  };
};