'use strict';

const _ = require('lodash');
const Local = require('./cli/domain/local');

function wrap(cmdScript, withRegistry) {
  return function(options, cb) {
    const dependencies = {
      local: new Local(),
      logger: options.logger || { log() {}, err() {}, ok() {}, warn() {} }
    };

    if (withRegistry) {
      const Registry = require('./cli/domain/registry');
      dependencies.registry = new Registry({ registry: options.registry });
    }

    const opts = _.omit(options, 'logger', 'registry');
    require(`./cli/facade/${cmdScript}.js`)(dependencies)(opts, cb);
  };
}

module.exports = {
  dev: wrap('dev'),
  init: wrap('init'),
  mock: wrap('mock'),
  package: wrap('package'),
  publish: wrap('publish', true),
  preview: wrap('preview', true),
  registry: {
    add: wrap('registry-add', true),
    ls: wrap('registry-ls', true),
    remove: wrap('registry-remove', true)
  }
};
