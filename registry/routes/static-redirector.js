'use strict';

var format = require('stringformat');
var fs = require('fs-extra');
var path = require('path');

var getFileInfo = require('../../utils/get-file-info');

module.exports = function(repository){
  return function(req, res){

    var filePath,
        clientPath = (!!res.conf.prefix ? res.conf.prefix : '/') + 'oc-client/client.js';

    if(req.route.path === clientPath){
      if(res.conf.local){
        filePath = path.join(__dirname, '../../components/oc-client/_package/src/oc-client.min.js');
      } else {
        return res.redirect(repository.getStaticClientPath());
      }
    } else if(req.params.componentName === 'oc-client'){
      filePath = path.join(__dirname, '../../components/oc-client/_package/' + req.params[0]);
    } else {
      filePath = path.join(res.conf.path, req.params.componentName) + '/_package/' + req.params[0];
    }

    if(!fs.existsSync(filePath)){
      res.errorDetails = format('File {0} not found', filePath);
      return res.json(404, { err: res.errorDetails });
    }

    var fileStream = fs.createReadStream(filePath),
        fileInfo = getFileInfo(filePath);

    if(!!fileInfo.mimeType){
      res.set('Content-Type', fileInfo.mimeType);
    }

    if(fileInfo.gzip){
      res.set('Content-Encoding', 'gzip');
    }

    fileStream.on('open', function(){
      fileStream.pipe(res);
    });
  };
};