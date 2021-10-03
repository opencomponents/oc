import fs from 'fs-extra';
import path from 'path';

import { getFileInfo } from 'oc-storage-adapters-utils';
import { Request, Response } from 'express';
import { Repository } from '../../types';

export default function staticRedirector(repository: Repository) {
  return function(req: Request, res: Response): void {
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
      res.status(404).json({ err: res.errorDetails });
      return;
    }

    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      res.errorDetails = 'Forbidden: Directory Listing Denied';
      res.status(403).json({ err: res.errorDetails });
      return;
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
}
