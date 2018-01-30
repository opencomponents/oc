'use strict';

const GetComponentHelper = require('./helpers/get-component');
const serializeError = require('serialize-error');
const _ = require('lodash');

module.exports = function(conf, repository) {
  const getComponent = new GetComponentHelper(conf, repository);

  return function(req, res) {
    getComponent(
      {
        conf: res.conf,
        headers: req.headers,
        name: req.params.componentName,
        parameters: req.query,
        version: req.params.componentVersion
      },
      result => {
        if (result.response.error) {
          if (_.isError(result.response.error)) {
            result.response.error = serializeError(result.response.error);
          }
          res.errorCode = result.response.code;
          res.errorDetails = result.response.error;
        }

        if (!_.isEmpty(result.headers)) {
          res.set(result.headers);
        }

        return res.status(result.status).json(result.response);
      }
    );
  };
};
