'use strict';

const format = require('stringformat');
const serializeError = require('serialize-error');
const _ = require('lodash');

const GetComponentHelper = require('./helpers/get-component');
const strings = require('../../resources');

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

        try {
          if (!_.isEmpty(result.headers)) {
            res.set(result.headers);
          }

          res.status(result.status).json(result.response);
        } catch (e) {
          res.status(500).json({
            code: 'RENDER_ERROR',
            error: format(
              strings.errors.registry.RENDER_ERROR,
              `${result.response.name}@${result.response.version}`,
              e.toString()
            )
          });
        }
      }
    );
  };
};
