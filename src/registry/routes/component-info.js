'use strict';

const parseAuthor = require('parse-author');
const _ = require('lodash');

const getComponentFallback = require('./helpers/get-component-fallback');
const infoView = require('../views/info');
const isUrlDiscoverable = require('./helpers/is-url-discoverable');
const urlBuilder = require('../domain/url-builder');

function getParams(component) {
  let params = {};
  if (component.oc.parameters) {
    const mandatoryParams = _.filter(
      _.keys(component.oc.parameters),
      paramName => {
        const param = component.oc.parameters[paramName];
        return !!param.mandatory && !!param.example;
      }
    );

    params = _.mapValues(
      _.pick(component.oc.parameters, mandatoryParams),
      x => x.example
    );
  }

  return params;
}

function getParsedAuthor(component) {
  const author = component.author || {};
  return _.isString(author) ? parseAuthor(author) : author;
}

function componentInfo(err, req, res, component) {
  if (err) {
    res.errorDetails = err.registryError || err;
    return res.status(404).json(err);
  }

  const isHtmlRequest =
    !!req.headers.accept && req.headers.accept.indexOf('text/html') >= 0;

  if (isHtmlRequest && !!res.conf.discovery) {
    const params = getParams(component);
    const parsedAuthor = getParsedAuthor(component);
    let href = res.conf.baseUrl;

    const repositoryUrl = _.get(
      component,
      'repository.url',
      _.isString(component.repository) ? component.repository : null
    );

    isUrlDiscoverable(href, (err, result) => {
      if (!result.isDiscoverable) {
        href = `//${req.headers.host}${res.conf.prefix}`;
      }

      res.send(
        infoView({
          component,
          dependencies: _.keys(component.dependencies),
          href,
          parsedAuthor,
          repositoryUrl,
          sandBoxDefaultQs: urlBuilder.queryString(params),
          title: 'Component Info'
        })
      );
    });
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
          return getComponentFallback.getComponentInfo(
            conf,
            req,
            res,
            registryError,
            (fallbackError, fallbackComponent) =>
              componentInfo(fallbackError, req, res, fallbackComponent)
          );
        }

        componentInfo(registryError, req, res, component);
      }
    );
  };
};
