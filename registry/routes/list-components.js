'use strict';

var packageInfo = require('../../package.json');
var urlBuilder = require('../domain/url-builder');
var _ = require('underscore');

module.exports = function(repository){
  return function(req, res){

    repository.getComponents(function(err, components){
      if(err){
        res.errorDetails = 'cdn not available';
        return res.json(404, { error: res.errorDetails });
      }

      res.json(200, {
        href: res.conf.baseUrl,
        components: _.map(components, function(component){
          return urlBuilder.component(component, res.conf.baseUrl);
        }),
        type: res.conf.local ? 'oc-registry-local' : 'oc-registry',
        ocVersion: packageInfo.version
      });
    });
  };
};