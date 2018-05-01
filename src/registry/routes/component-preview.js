'use strict';

const _ = require('lodash');

const getComponentFallback = require('./helpers/get-component-fallback');
const previewView = require('../views/preview');
const urlBuilder = require('../domain/url-builder');

function componentPreview(err, req, res, component, templates) {
  if (err) {
    res.errorDetails = err.registryError || err;
    res.errorCode = 'NOT_FOUND';
    return res.status(404).json(err);
  }

  let liveReload = '';
  if (res.conf.liveReloadPort) {
    liveReload = `<script src="http://localhost:${
      res.conf.liveReloadPort
    }/livereload.js?snipver=1"></script>`;
  }

  const isHtmlRequest =
    !!req.headers.accept && req.headers.accept.indexOf('text/html') >= 0;

  if (isHtmlRequest && !!res.conf.discovery) {
    return res.send(
      previewView({
        component,
        dependencies: _.keys(component.dependencies),
        href: res.conf.baseUrl,
        liveReload,
        qs: urlBuilder.queryString(req.query),
        templates
      })
    );
  } else {
    res.status(200).json(
      _.extend(component, {
        requestVersion: req.params.componentVersion || ''
      })
    );
  }
}

module.exports = function(conf, repository) {
  return function(req, res) {
    repository.getComponent(
      req.params.componentName,
      req.params.componentVersion,
      (registryError, component) => {
        if (registryError && conf.fallbackRegistryUrl) {
          return getComponentFallback.getComponentPreview(
            conf,
            req,
            res,
            registryError,
            (fallbackError, fallbackComponent) => {
              componentPreview(
                fallbackError,
                req,
                res,
                fallbackComponent,
                repository.getTemplatesInfo()
              );
            }
          );
        }

        componentPreview(
          registryError,
          req,
          res,
          component,
          repository.getTemplatesInfo()
        );
      }
    );
  };
};
