'use strict';

const _ = require('underscore');
const dateStringified = require('./date-stringify');

module.exports = function(history) {
  const result = [];

  _.each(history.components, (singleComponent, name) => {
    _.each(singleComponent, (release) => {
      const entry = {
        name,
        version: release.version,
        lastModified: dateStringified(new Date(release.lastModified))
      };

      result.push(entry);
    });
  });

  return _.sortBy(result, 'lastModified').reverse();
};