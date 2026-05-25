'use strict';

module.exports.data = function (context, callback) {
  callback(null, {
    firstName: context.params.firstName || 'John',
    lastName: context.plugins.appendSuffix(
      context.params.lastName || 'Doe',
      context.params.suffix || ''
    )
  });
};
