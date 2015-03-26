'use strict';

var querystring = require('querystring');
var request = require('../../utils/request');
var url = require('url');

var removeFinalSlashes = function(s){
  while(s.slice(-1) === '/'){
    s = s.slice(0, -1);
  }
  return s;
};

module.exports = {
  parse: function(componentHref, callback){
    request(componentHref, function(err, res){
      if(err){ return callback(err); }

      var parsed = JSON.parse(res),
          requestedVersion = parsed.requestVersion,
          href = url.parse(componentHref),
          relativePath = removeFinalSlashes(href.pathname),
          withoutVersion = removeFinalSlashes(relativePath.replace(requestedVersion, '')),
          componentName = withoutVersion.substr(withoutVersion.lastIndexOf('/') + 1),
          withoutComponent = removeFinalSlashes(withoutVersion.replace(componentName, '')),
          registryUrl = href.protocol + '//' + href.host + withoutComponent + '/';

      callback(null, {
        clientHref: registryUrl + 'oc-client/client.js',
        componentName: componentName,
        parameters: querystring.parse(href.query),
        registryUrl: registryUrl,
        version: requestedVersion
      });
    }); 
  }
};