import path from 'node:path';
import fs from 'fs-extra';
import * as storageUtils from 'oc-storage-adapters-utils';
import type { OcHandler } from '../domain/http-server/types';
import type { Repository } from '../domain/repository';
import compress from '../middleware/compression';

export type StaticRedirectorRouteId =
  | 'client'
  | 'dev-client'
  | 'client-map'
  | 'local-static';

export default function staticRedirector(
  repository: Repository,
  routeId: StaticRedirectorRouteId
): OcHandler {
  return (req, res): void => {
    let filePath: string;

    if (routeId === 'client' || routeId === 'dev-client') {
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
          if (routeId === 'client') {
            compress(
              {
                uncompressed: res.conf.compiledClient.code.minified,
                brotli: res.conf.compiledClient.code.brotli,
                gzip: res.conf.compiledClient.code.gzip
              },
              req,
              res
            );
          } else {
            res.send(res.conf.compiledClient.dev);
          }
          return;
        }
        res.redirect(repository.getStaticClientPath(routeId === 'dev-client'));
        return;
      }
    } else if (routeId === 'client-map') {
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
        '../../components/oc-client/_package/' + req.params['splat']
      );
    } else {
      filePath =
        path.join(res.conf.path, req.params['componentName']) +
        '/_package/' +
        req.params['splat'];
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
      res.stream(fileStream);
    });
  };
}
