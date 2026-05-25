var isequal = require('lodash.isequal');

module.exports.data = (context, callback) => {
  callback(null, {
    magicNumber: isequal(1, 1) ? 5 : 0
  });
};
