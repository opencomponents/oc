'use strict';

module.exports.data = function (context, callback) {
  context.setCookie('Test-Cookie', 'Cookie-Value');
  context.setCookie('Another-Cookie', 'Another-Value', { httpOnly: true });
  callback(null, {});
};


