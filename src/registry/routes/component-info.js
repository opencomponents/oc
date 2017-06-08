'use strict';

const parseAuthor = require('parse-author');
const _ = require('lodash');

const getComponentFallback = require('./helpers/get-component-fallback');
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

function addGetRepositoryUrlFunction(component) {
  component.getRepositoryUrl = function() {
    if (_.isObject(this.repository)) {
      if (this.repository.url) {
        return this.repository.url;
      }
    }
    if (_.isString(this.repository)) {
      return this.repository;
    }
    return null;
  };
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

    addGetRepositoryUrlFunction(component);

    isUrlDiscoverable(href, (err, result) => {
      if (!result.isDiscoverable) {
        href = '//' + req.headers.host + res.conf.prefix;
      }

      res.render('component-info', {
        component: component,
        dependencies: _.keys(component.dependencies),
        href: href,
        parsedAuthor: parsedAuthor,
        sandBoxDefaultQs: urlBuilder.queryString(params)
      });
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
            (fallbackError, fallbackComponent) => {
              componentInfo(fallbackError, req, res, fallbackComponent);
            }
          );
        }

        componentInfo(registryError, req, res, component);
      }
    );
  };
};
