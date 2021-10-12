'use strict';

module.exports.data = function (context, callback) {
  context.setHeader('Test-Header', 'Test-Value');
  context.setHeader('Cache-Control', 'public max-age=3600');
  callback(null, {});
};
