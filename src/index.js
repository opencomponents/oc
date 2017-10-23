'use strict';

const _ = require('lodash');
const Local = require('./cli/domain/local');

module.exports.cli = require('./cli/programmatic-api');
module.exports.Client = require('oc-client');
module.exports.Registry = require('./registry');
