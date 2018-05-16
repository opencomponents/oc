'use strict';

const async = require('async');
const parseAuthor = require('parse-author');
const _ = require('lodash');

const dateStringified = require('../../utils/date-stringify');
const getComponentsHistory = require('./helpers/get-components-history');
const getAvailableDependencies = require('./helpers/get-available-dependencies');
const indexView = require('../views');
const packageInfo = require('../../../package.json');
const urlBuilder = require('../domain/url-builder');

const getParsedAuthor = author => {
  author = author || {};
  return _.isString(author) ? parseAuthor(author) : author;
};

const mapComponentDetails = component =>
  _.extend(component, { author: getParsedAuthor(component.author) });

const isHtmlRequest = headers =>
  !!headers.accept && headers.accept.indexOf('text/html') >= 0;

module.exports = function(repository) {
  return function(req, res, next) {
    repository.getComponents((err, components) => {
      if (err) {
        res.errorDetails = 'cdn not available';
        return res.status(404).json({ error: res.errorDetails });
      }

      const baseResponse = {
        href: res.conf.baseUrl,
        ocVersion: packageInfo.version,
        type: res.conf.local ? 'oc-registry-local' : 'oc-registry'
      };

      if (isHtmlRequest(req.headers) && !!res.conf.discovery) {
        let componentsInfo = [],
          componentsReleases = 0;
        const stateCounts = {};

        async.each(
          components,
          (component, callback) =>
            repository.getComponent(component, (err, result) => {
              if (err) return callback(err);

              if (result.oc && result.oc.date) {
                result.oc.stringifiedDate = dateStringified(
                  new Date(result.oc.date)
                );
              }

              componentsInfo.push(mapComponentDetails(result));
              componentsReleases += result.allVersions.length;
              callback();
            }),
          err => {
            if (err) return next(err);

            componentsInfo = _.sortBy(componentsInfo, 'name');
            repository.getComponentsDetails((err, details) => {
              if (err) console.log(err);
              res.send(
                indexView(
                  _.extend(baseResponse, {
                    availableDependencies: getAvailableDependencies(
                      res.conf.dependencies
                    ),
                    availablePlugins: res.conf.plugins,
                    components: componentsInfo,
                    componentsReleases,
                    componentsList: _.map(componentsInfo, component => {
                      const state = _.get(component, 'oc.state', '');
                      if (state) {
                        stateCounts[state] = stateCounts[state] || 0;
                        stateCounts[state] += 1;
                      }

                      return {
                        name: component.name,
                        author: component.author,
                        state
                      };
                    }),
                    componentsHistory:
                      !res.conf.local && getComponentsHistory(details),
                    q: req.query.q || '',
                    stateCounts,
                    templates: repository.getTemplatesInfo(),
                    title: 'OpenComponents Registry'
                  })
                )
              );
            });
          }
        );
      } else {
        res.status(200).json(
          _.extend(baseResponse, {
            components: _.map(components, component =>
              urlBuilder.component(component, res.conf.baseUrl)
            )
          })
        );
      }
    });
  };
};
