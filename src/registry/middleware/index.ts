import express, { Express } from 'express';
import errorhandler from 'errorhandler';
import morgan from 'morgan';
import Router from 'express-promise-router';

import baseUrlHandler from './base-url-handler';
import cors from './cors';
import discoveryHandler from './discovery-handler';
import fileUploads from './file-uploads';
import requestHandler from './request-handler';
import { Config } from '../../types';

const bodyParserJsonArgument: { inflate: boolean; limit?: number } = {
  inflate: true
};
const bodyParserUrlEncodedArgument: { extended: boolean; limit?: number } = {
  extended: true
};

export const bind = (
  app: Express,
  options: Config
): { app: Express; router: express.Router } => {
  app.set('port', options.port);
  app.set('json spaces', 0);
  app.set('etag', 'strong');

  app.use((_req, res, next) => {
    res.conf = options;
    next();
  });

  app.use(requestHandler());

  if (options.postRequestPayloadSize) {
    bodyParserJsonArgument.limit = options.postRequestPayloadSize;
    bodyParserUrlEncodedArgument.limit = options.postRequestPayloadSize;
  }

  app.use(express.json(bodyParserJsonArgument));
  app.use(express.urlencoded(bodyParserUrlEncodedArgument));

  app.use(cors);
  app.use(fileUploads);
  app.use(baseUrlHandler);
  app.use(discoveryHandler);

  if (options.verbosity) {
    app.use(morgan('dev'));
  }

  if (options.local) {
    app.use(errorhandler());
  }

  const router = Router();
  app.use(router);

  return { app, router };
};
