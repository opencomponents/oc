'use strict';

var colors = require('colors/safe');
var opn = require('opn');
var querystring = require('querystring');
var _ = require('underscore');

var strings = require('../../resources/index');
var urlParser = require('../../registry/domain/url-parser');

module.exports = function(dependencies){

  var logger = dependencies.logger;

  return function(opts){

    urlParser.parse(opts.componentHref, function(err, parsed){
      if(err){ return logger.log(colors.red(strings.errors.cli.COMPONENT_HREF_NOT_FOUND)); }

      var href = parsed.registryUrl + parsed.componentName + '/';

      if(!!parsed.version){
        href += parsed.version + '/';
      }

      href += '~preview/';

      if(!!parsed.parameters && !_.isEmpty(parsed.parameters)){
        href += '?' + querystring.stringify(parsed.parameters);
      }
      
      opn(href);
    });
  };
};
