'use strict';

var colors = require('colors');
var format = require('stringformat');
var http = require('http');
var opn = require('opn');

var strings = require('../../resources/index');
var urlParser = require('../../registry/domain/url-parser');

module.exports = function(dependencies){

  var logger = dependencies.logger;

  return function(opts){

    var port = opts.port || 3000;

    urlParser.parse(opts.componentHref, function(err, parsed){
      if(err){ return logger.log(strings.errors.cli.COMPONENT_HREF_NOT_FOUND.red); }

      http.createServer(function(req, res){
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end(format('<!DOCTYPE html><html><head><meta charset="utf-8" />' +
                       '</head><body><oc-component href="{0}"></oc-component>' +
                       '<script src="{1}"></script></body></html>', 
                        opts.componentHref, parsed.clientHref));

      }).listen(port, function(){
        var previewUrl = 'http://localhost:' + port;
        logger.log(format(strings.messages.cli.PREVIEW_STARTED_AT_URL, previewUrl).green);
        opn(previewUrl);
      });
    });

  };
};
