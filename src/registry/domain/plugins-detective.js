'use strict';

const _ = require('lodash');

module.exports.parse = function(code){

  const matchedDataExports = code.match(/module.exports.data\s?=\s?function\(\w+,/gi);

  const contexts = _.map(matchedDataExports, (match) => match.slice(match.indexOf('(') + 1, -1));

  if(_.isEmpty(contexts)){
    return [];
  }

  const context = contexts[0],
    search = new RegExp(context+'\\.plugins\\.\\w+', 'gi'),
    repl = new RegExp(context+'\\.plugins\\.', 'gi');

  return _.map(code.match(search), (match) => match.replace(repl, ''));
};