'use strict';

var querystring = require('querystring');
var url = require('url');

var removeFinalSlashes = function(s){
  while(s.slice(-1) === '/'){
    s = s.slice(0, -1);
  }
  return s;
};

module.exports = {
  parse: function(parsed){

    var requestedVersion = parsed.requestVersion,
        href = url.parse(parsed.href),
        relativePath = removeFinalSlashes(href.pathname),
        withoutVersion = removeFinalSlashes(relativePath.replace(requestedVersion, '')),
        componentName = withoutVersion.substr(withoutVersion.lastIndexOf('/') + 1),
        withoutComponent = removeFinalSlashes(withoutVersion.replace(componentName, '')),
        registryUrl = href.protocol + '//' + href.host + withoutComponent + '/';

    return {
      clientHref: registryUrl + 'oc-client/client.js',
      name: componentName,
      parameters: querystring.parse(href.query),
      registryUrl: registryUrl,
      version: requestedVersion
    };
  }
};