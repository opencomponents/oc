'use strict';

var _ = require('underscore');
var dateStringified = require('./date-stringify');

module.exports = function(history) {
  var result = [];
  
  _.each(history.components, function(singleComponent, name) {
    _.each(singleComponent, function(release) {
      var entry = {
        name,
        version: release.version,
        lastModified: dateStringified(new Date(release.lastModified))
      };
      
      result.push(entry);
    });
  });
  
  return _.sortBy(result, 'lastModified').reverse();
};