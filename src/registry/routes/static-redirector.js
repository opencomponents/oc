'use strict';

const format = require('stringformat');
const fs = require('fs-extra');
const path = require('path');

const getFileInfo = require('oc-storage-adapters-utils').getFileInfo;

module.exports = function(repository) {
  return function(req, res) {
    let filePath;
    const clientPath =
        (res.conf.prefix ? res.conf.prefix : '/') + 'oc-client/client.js',
      clientMapPath =
        (res.conf.prefix ? res.conf.prefix : '/') +
        'oc-client/oc-client.min.map';

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
      res.errorDetails = format('File {0} not found', filePath);
      return res.status(404).json({ err: res.errorDetails });
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
