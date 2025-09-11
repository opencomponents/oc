import cookieParser from 'cookie-parser';
import errorhandler from 'errorhandler';
import express, { type Express } from 'express';
import morgan from 'morgan';

import type { Config } from '../../types';
import baseUrlHandler from './base-url-handler';
import cors from './cors';
import discoveryHandler from './discovery-handler';
import fileUploads from './file-uploads';
import requestHandler from './request-handler';

const bodyParserJsonArgument: { inflate: boolean; limit?: number } = {
  inflate: true
};
const bodyParserUrlEncodedArgument: { extended: boolean; limit?: number } = {
  extended: true
};

export const bind = (app: Express, options: Config): Express => {
  app.set('port', options.port);
  app.set('json spaces', 0);
  app.set('etag', 'strong');

  app.use((_req, res, next) => {
    res.conf = options;
    next();
  });

  app.use(requestHandler());
  app.use(cookieParser());

  if (options.postRequestPayloadSize) {
    // Type is incorrect since limit can be a string like '50mb'
    bodyParserJsonArgument.limit = options.postRequestPayloadSize as number;
    bodyParserUrlEncodedArgument.limit =
      options.postRequestPayloadSize as number;
  }

  app.use(express.json(bodyParserJsonArgument));
  app.use(express.urlencoded(bodyParserUrlEncodedArgument));

  app.use(cors);
  app.use(fileUploads);
  app.use(baseUrlHandler);
  app.use(discoveryHandler);

  if (options.verbosity) {
    app.use(
      morgan('dev', {
        skip: (req, res) => {
          // Hide logging development console calls
          return req.url.startsWith(
            `${res.conf.prefix}~actions/$$__oc__server___console__$$`
          );
        }
      })
    );
  }

  if (options.local) {
    app.use(errorhandler());
  }

  return app;
};
