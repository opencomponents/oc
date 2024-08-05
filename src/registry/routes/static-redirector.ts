import path from 'node:path';
import type { Request, Response } from 'express';
import fs from 'fs-extra';

import * as storageUtils from 'oc-storage-adapters-utils';
import type { Repository } from '../domain/repository';

export default function staticRedirector(repository: Repository) {
  return (req: Request, res: Response): void => {
    let filePath: string;
    const clientPath = `${res.conf.prefix || '/'}oc-client/client.js`;
    const devClientPath = `${res.conf.prefix || '/'}oc-client/client.dev.js`;
    const clientMapPath = `${
      res.conf.prefix || '/'
    }oc-client/oc-client.min.map`;

    if (req.route.path === clientPath || req.route.path === devClientPath) {
      if (res.conf.local) {
        if (res.conf.compiledClient) {
          res.type('application/javascript');
          res.send(res.conf.compiledClient.dev);
          return;
        }
        filePath = path.join(
          __dirname,
          '../../components/oc-client/_package/src/oc-client.js'
        );
      } else {
        if (res.conf.compiledClient) {
          res.type('application/javascript');
          res.send(
            req.route.path === clientPath
              ? res.conf.compiledClient.code
              : res.conf.compiledClient.dev
          );
          return;
        }
        res.redirect(
          repository.getStaticClientPath(req.route.path === devClientPath)
        );
        return;
      }
    } else if (req.route.path === clientMapPath) {
      if (res.conf.local) {
        filePath = path.join(
          __dirname,
          '../../components/oc-client/_package/src/oc-client.min.map'
        );
      } else {
        if (res.conf.compiledClient) {
          res.type('text/plain');
          res.send(res.conf.compiledClient.map);
          return;
        }
        res.redirect(repository.getStaticClientMapPath());
        return;
      }
    } else if (req.params['componentName'] === 'oc-client') {
      filePath = path.join(
        __dirname,
        '../../components/oc-client/_package/' + req.params[0]
      );
    } else {
      filePath =
        path.join(res.conf.path, req.params['componentName']) +
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

    const fileStream = fs.createReadStream(filePath);
    const fileInfo = storageUtils.getFileInfo(filePath);

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
