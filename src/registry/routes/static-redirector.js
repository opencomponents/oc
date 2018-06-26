'use strict';

const fs = require('fs-extra');
const path = require('path');

const getFileInfo = require('oc-storage-adapters-utils').getFileInfo;

module.exports = function(repository) {
  return function(req, res) {
    let filePath;
    const clientPath = `${res.conf.prefix || '/'}oc-client/client.js`;
    const clientMapPath = `${res.conf.prefix ||
      '/'}oc-client/oc-client.min.map`;

    if (req.route.path === clientPath) {
      if (res.conf.local) {
        filePath = path.join(
          __dirname,
          '../../components/oc-client/_package/src/oc-client.min.js'
        );
      } else {
        return res.redirect(repository.getStaticClientPath());
      }
    } else if (req.route.path === clientMapPath) {
      if (res.conf.local) {
        filePath = path.join(
          __dirname,
          '../../components/oc-client/_package/src/oc-client.min.map'
        );
      } else {
        return res.redirect(repository.getStaticClientMapPath());
      }
    } else if (req.params.componentName === 'oc-client') {
      filePath = path.join(
        __dirname,
        '../../components/oc-client/_package/' + req.params[0]
      );
    } else {
      filePath =
        path.join(res.conf.path, req.params.componentName) +
        '/_package/' +
        req.params[0];
    }

    if (!fs.existsSync(filePath)) {
      res.errorDetails = `File ${filePath} not found`;
      return res.status(404).json({ err: res.errorDetails });
    }
    
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      res.errorDetails = 'Forbidden: Directory Listing Denied';
      return res.status(403).json({ err: res.errorDetails });
    }

    const fileStream = fs.createReadStream(filePath),
      fileInfo = getFileInfo(filePath);

    if (fileInfo.mimeType) {
      res.set('Content-Type', fileInfo.mimeType);
    }

    if (fileInfo.gzip) {
      res.set('Content-Encoding', 'gzip');
    }

    fileStream.on('open', () => {
      fileStream.pipe(res);
    });
  };
};
