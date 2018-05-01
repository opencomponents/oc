'use strict';

const bodyParser = require('body-parser');
const errorhandler = require('errorhandler');
const morgan = require('morgan');
const path = require('path');

const baseUrlHandler = require('./base-url-handler');
const cors = require('./cors');
const discoveryHandler = require('./discovery-handler');
const fileUploads = require('./file-uploads');
const requestHandler = require('./request-handler');

module.exports.bind = function(app, options) {
  app.set('port', options.port);
  app.set('json spaces', 0);

  app.use((req, res, next) => {
    res.conf = options;
    next();
  });

  app.use(requestHandler());
  app.use(bodyParser.json({ inflate: true }));
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(cors);
  app.use(fileUploads);
  app.use(baseUrlHandler);
  app.use(discoveryHandler);

  if (options.verbosity) {
    app.use(morgan('dev'));
  }

  if (options.local) {
    app.use(errorhandler({ dumpExceptions: true, showStack: true }));
  }

  return app;
};
