/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

module.exports.cli = require('./cli/programmatic-api').default;
module.exports.Client = require('oc-client');
module.exports.Registry = require('./registry').default;
