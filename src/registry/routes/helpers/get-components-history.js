'use strict';

const _ = require('lodash');

const dateStringified = require('../../../utils/date-stringify');

module.exports = history => {
  const result = [];

  _.each(history.components, (versions, name) => {
    _.each(versions, (details, version) => {
      result.push({
        name,
        publishDate: details.publishDate,
        version
      });
    });
  });

  return _.sortBy(result, 'publishDate')
    .reverse()
    .map(x => ({
      name: x.name,
      version: x.version,
      publishDate: !x.publishDate
        ? 'Unknown'
        : dateStringified(new Date(x.publishDate))
    }));
};
